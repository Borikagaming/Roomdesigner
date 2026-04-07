<?php

use App\Models\BannedEmail;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;

uses(RefreshDatabase::class);

test('banned email login returns the ban reason', function () {
    BannedEmail::query()->create([
        'email' => 'banned@example.com',
        'reason' => 'Tobbszori szabalysertes',
    ]);

    $response = $this->postJson('/api/login', [
        'identifier' => 'banned@example.com',
        'password' => 'irrelevant',
    ]);

    $response
        ->assertStatus(403)
        ->assertJsonPath('message', 'Ez az email cim ki van bannolva. Indok: Tobbszori szabalysertes')
        ->assertJsonPath('is_banned', true)
        ->assertJsonPath('ban.email', 'banned@example.com')
        ->assertJsonPath('ban.reason', 'Tobbszori szabalysertes');
});

test('banned email can submit an appeal message', function () {
    BannedEmail::query()->create([
        'email' => 'banned@example.com',
        'reason' => 'Tobbszori szabalysertes',
    ]);

    $response = $this->postJson('/api/banned-emails/appeal', [
        'email' => 'banned@example.com',
        'message' => 'Szeretnem felulvizsgalni a tiltast, mert szerintem tevedes tortent.',
    ]);

    $response
        ->assertOk()
        ->assertJsonPath('ban.email', 'banned@example.com');

    $this->assertDatabaseHas('banned_emails', [
        'email' => 'banned@example.com',
        'appeal_message' => 'Szeretnem felulvizsgalni a tiltast, mert szerintem tevedes tortent.',
    ]);
});

test('admin user listing omits password display fields', function () {
    $admin = User::factory()->create([
        'name' => 'Admin Teszt',
        'username' => 'adminteszt',
        'email' => 'admin-test@example.com',
        'is_admin' => true,
    ]);

    User::factory()->create([
        'name' => 'Felhasznalo Teszt',
        'username' => 'felhasznaloteszt',
        'email' => 'felhasznalo-test@example.com',
    ]);

    Sanctum::actingAs($admin);

    $response = $this->getJson('/api/admin/users');

    $response->assertOk();

    foreach ($response->json('data') as $user) {
        expect(array_key_exists('password_display', $user))->toBeFalse();
    }
});

test('admin can unban a banned email', function () {
    $admin = User::factory()->create([
        'name' => 'Admin Teszt',
        'email' => 'admin@example.com',
        'is_admin' => true,
    ]);

    $user = User::factory()->create([
        'name' => 'Visszaallitando Felhasznalo',
        'username' => 'visszaallito',
        'email' => 'banned@example.com',
        'password' => 'TesztJelszo123',
    ]);

    Sanctum::actingAs($admin);

    $this->postJson('/api/admin/users/' . $user->id . '/ban', [
        'reason' => 'Tobbszori szabalysertes',
    ])->assertOk();

    $bannedEmail = BannedEmail::query()->where('email', 'banned@example.com')->firstOrFail();

    expect($bannedEmail->archived_name)->toBe('Visszaallitando Felhasznalo');
    expect($bannedEmail->archived_username)->toBe('visszaallito');
    expect($bannedEmail->archived_password)->not->toBeNull();

    $this->deleteJson('/api/admin/banned-emails/' . $bannedEmail->id)
        ->assertOk()
        ->assertJsonPath('email', 'banned@example.com')
        ->assertJsonPath('user.email', 'banned@example.com');

    $this->assertDatabaseMissing('banned_emails', [
        'id' => $bannedEmail->id,
    ]);

    $restoredUser = User::query()->where('email', 'banned@example.com')->first();

    expect($restoredUser)->not->toBeNull();
    expect($restoredUser?->name)->toBe('Visszaallitando Felhasznalo');
    expect($restoredUser?->username)->toBe('visszaallito');
    expect(Hash::check('TesztJelszo123', (string) $restoredUser?->password))->toBeTrue();
});
