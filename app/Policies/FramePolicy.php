<?php

namespace App\Policies;

use App\Models\Frame;
use App\Models\User;

class FramePolicy
{
    public function view(User $user, Frame $frame): bool
    {
        return $frame->story->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Frame $frame): bool
    {
        return $frame->story->user_id === $user->id;
    }

    public function delete(User $user, Frame $frame): bool
    {
        return $frame->story->user_id === $user->id;
    }
}
