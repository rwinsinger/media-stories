<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Frame extends Model
{
    /** @use HasFactory<\Database\Factories\FrameFactory> */
    use HasFactory, HasUuids;

    public $timestamps = false;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'story_id',
        'order_index',
        'media_type',
        'media_url',
        'thumbnail_url',
        'text_content',
        'audio_url',
        'duration',
        'settings',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
            'settings' => 'array',
        ];
    }

    public function story(): BelongsTo
    {
        return $this->belongsTo(Story::class);
    }
}
