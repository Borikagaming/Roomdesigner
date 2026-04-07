<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    private const ADMIN_USERNAME = 'adminnnnnnnnn31235434355345';
    private const ADMIN_EMAIL = 'adminnnnnnnnn31235434355345@admin.local';
    private const ADMIN_PASSWORD = 'AdMiN13235347534912872364967234';

    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username')->nullable()->unique()->after('name');
            $table->boolean('is_admin')->default(false)->after('profile_image');
        });

        DB::table('users')->updateOrInsert(
            ['username' => self::ADMIN_USERNAME],
            [
                'name' => 'Admin',
                'username' => self::ADMIN_USERNAME,
                'email' => self::ADMIN_EMAIL,
                'password' => Hash::make(self::ADMIN_PASSWORD),
                'is_admin' => true,
                'profile_image' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        );
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['username']);
            $table->dropColumn(['username', 'is_admin']);
        });
    }
};
