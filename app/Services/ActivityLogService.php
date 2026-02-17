<?php

namespace App\Services;

use App\Models\ActivityLog;
use Illuminate\Http\Request;

class ActivityLogService
{
    public function log(
        ?int $userId,
        string $action,
        string $category,
        ?string $resourceType = null,
        ?string $resourceId = null,
        ?array $details = null,
        bool $isAdminAction = false,
        ?int $targetUserId = null,
        ?Request $request = null,
    ): ActivityLog {
        return ActivityLog::query()->create([
            'user_id' => $userId,
            'action' => $action,
            'action_category' => $category,
            'resource_type' => $resourceType,
            'resource_id' => $resourceId,
            'details' => $details,
            'ip_address' => $request?->ip(),
            'user_agent' => $request?->userAgent(),
            'is_admin_action' => $isAdminAction,
            'target_user_id' => $targetUserId,
        ]);
    }
}
