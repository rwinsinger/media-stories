<?php

namespace App\Policies;

use App\Models\Story;
use App\Models\User;

class StoryPolicy
{
    public function view(User $user, Story $story): bool
    {
        if ($story->user_id === $user->id) {
            return true;
        }

        return $story->storyShares()
            ->where('shared_with_user_id', $user->id)
            ->where('is_revoked', false)
            ->where(function ($query): void {
                $query->whereNull('expires_at')->orWhere('expires_at', '>', now());
            })
            ->exists();
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Story $story): bool
    {
        return $story->user_id === $user->id;
    }

    public function delete(User $user, Story $story): bool
    {
        return $story->user_id === $user->id;
    }
}
