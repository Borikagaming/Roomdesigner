<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banned_emails', function (Blueprint $table) {
            $table->string('archived_name')->nullable()->after('email');
            $table->string('archived_username')->nullable()->after('archived_name');
            $table->string('archived_password')->nullable()->after('archived_username');
            $table->longText('archived_profile_image')->nullable()->after('archived_password');
            $table->timestamp('archived_email_verified_at')->nullable()->after('archived_profile_image');
        });
    }

    public function down(): void
    {
        Schema::table('banned_emails', function (Blueprint $table) {
            $table->dropColumn([
                'archived_name',
                'archived_username',
                'archived_password',
                'archived_profile_image',
                'archived_email_verified_at',
            ]);
        });
    }
};
