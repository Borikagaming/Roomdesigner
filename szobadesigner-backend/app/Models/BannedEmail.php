<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BannedEmail extends Model
{
    protected $fillable = [
        'email',
        'archived_name',
        'archived_username',
        'archived_password',
        'archived_profile_image',
        'archived_email_verified_at',
        'reason',
        'appeal_message',
        'appeal_submitted_at',
        'banned_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'archived_email_verified_at' => 'datetime',
            'appeal_submitted_at' => 'datetime',
        ];
    }

    public function bannedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'banned_by_user_id');
    }
}
