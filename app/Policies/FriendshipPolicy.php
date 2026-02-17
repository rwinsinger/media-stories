<?php

namespace App\Policies;

use App\Models\Friendship;
use App\Models\User;

class FriendshipPolicy
{
    public function update(User $user, Friendship $friendship): bool
    {
        return $friendship->requester_id === $user->id || $friendship->addressee_id === $user->id;
    }

    public function delete(User $user, Friendship $friendship): bool
    {
        return $friendship->requester_id === $user->id || $friendship->addressee_id === $user->id;
    }
}
