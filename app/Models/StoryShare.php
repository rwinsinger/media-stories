<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StoryShare extends Model
{
    /** @use HasFactory<\Database\Factories\StoryShareFactory> */
    use HasFactory, HasUuids;

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'story_id',
        'shared_by_user_id',
        'shared_with_user_id',
        'permission_level',
        'shared_at',
        'expires_at',
        'view_count',
        'last_viewed_at',
        'is_revoked',
        'revoked_at',
        'message',
    ];

    protected function casts(): array
    {
        return [
            'shared_at' => 'datetime',
            'expires_at' => 'datetime',
            'last_viewed_at' => 'datetime',
            'revoked_at' => 'datetime',
            'is_revoked' => 'boolean',
        ];
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }

    public function sharedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_by_user_id');
    }

    public function sharedWith(): BelongsTo
    {
        return $this->belongsTo(User::class, 'shared_with_user_id');
    }
}
