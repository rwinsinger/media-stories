<?php

namespace App\Policies;

use App\Models\ActivityLog;
use App\Models\User;

class ActivityLogPolicy
{
    public function view(User $user, ActivityLog $activityLog): bool
    {
        return $activityLog->user_id === $user->id;
    }
}
