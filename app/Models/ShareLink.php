<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class ShareLink extends Model
{
    /** @use HasFactory<\Database\Factories\ShareLinkFactory> */
    use HasFactory, HasUuids;

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'story_id',
        'token',
        'expires_at',
        'view_count',
        'max_views',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'created_at' => 'datetime',
        ];
    }

    protected static function booted(): void
    {
        static::creating(function (ShareLink $shareLink): void {
            if (empty($shareLink->token)) {
                $shareLink->token = Str::random(40);
            }

            if (empty($shareLink->expires_at)) {
                $shareLink->expires_at = now()->addHours(72);
            }
        });
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }

    public function isExpired(): bool
    {
        return $this->expires_at->isPast();
    }

    public function isExhausted(): bool
    {
        return $this->max_views !== null && $this->view_count >= $this->max_views;
    }
}
