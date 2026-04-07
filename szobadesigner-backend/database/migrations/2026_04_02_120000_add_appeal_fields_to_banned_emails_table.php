<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('banned_emails', function (Blueprint $table) {
            $table->text('appeal_message')->nullable()->after('reason');
            $table->timestamp('appeal_submitted_at')->nullable()->after('appeal_message');
        });
    }

    public function down(): void
    {
        Schema::table('banned_emails', function (Blueprint $table) {
            $table->dropColumn(['appeal_message', 'appeal_submitted_at']);
        });
    }
};
