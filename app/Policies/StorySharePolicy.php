<?php

namespace App\Policies;

use App\Models\StoryShare;
use App\Models\User;

class StorySharePolicy
{
    public function view(User $user, StoryShare $storyShare): bool
    {
        return $storyShare->shared_by_user_id === $user->id || $storyShare->shared_with_user_id === $user->id;
    }

    public function delete(User $user, StoryShare $storyShare): bool
    {
        return $storyShare->shared_by_user_id === $user->id;
    }
}
