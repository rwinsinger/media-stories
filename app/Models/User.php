<?php

namespace App\Models;

use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Fortify\TwoFactorAuthenticatable;

class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, TwoFactorAuthenticatable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'subscription_tier',
        'subscription_id',
        'subscription_status',
        'story_count',
        'is_admin',
        'is_suspended',
        'suspended_reason',
        'last_login_at',
        'settings',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
            'two_factor_confirmed_at' => 'datetime',
            'last_login_at' => 'datetime',
            'is_admin' => 'boolean',
            'is_suspended' => 'boolean',
            'settings' => 'array',
        ];
    }

    public function stories(): HasMany
    {
        return $this->hasMany(Story::class);
    }

    public function sentFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'requester_id');
    }

    public function receivedFriendRequests(): HasMany
    {
        return $this->hasMany(Friendship::class, 'addressee_id');
    }

    public function sharesGiven(): HasMany
    {
        return $this->hasMany(StoryShare::class, 'shared_by_user_id');
    }

    public function sharesReceived(): HasMany
    {
        return $this->hasMany(StoryShare::class, 'shared_with_user_id');
    }

    public function appNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function activityLogs(): HasMany
    {
        return $this->hasMany(ActivityLog::class);
    }

    public function isPremium(): bool
    {
        return $this->subscription_tier === 'premium';
    }

    public function maxStories(): ?int
    {
        return $this->isPremium() ? null : 5;
    }

    public function maxFriends(): int
    {
        return $this->isPremium() ? 500 : 10;
    }

    public function maxSharesPerStory(): int
    {
        return $this->isPremium() ? 50 : 3;
    }
}
