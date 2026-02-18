<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function show(User $user): JsonResponse
    {
        $user->load(['activityLogs' => function ($query): void {
            $query->orderByDesc('created_at')->limit(50);
        }]);

        return response()->json([
            'user' => $user,
            'story_count' => $user->stories()->count(),
            'activity_logs' => $user->activityLogs,
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $users = User::query()
            ->when($request->input('search'), function ($query, $search): void {
                $query->where(function ($q) use ($search): void {
                    $q->where('email', 'like', "%{$search}%")
                        ->orWhere('name', 'like', "%{$search}%");
                });
            })
            ->when($request->input('tier'), fn ($query, $tier) => $query->where('subscription_tier', $tier))
            ->when($request->input('suspended'), fn ($query) => $query->where('is_suspended', true))
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($users);
    }

    public function update(UpdateUserRequest $request, User $user): JsonResponse
    {
        $user->update($request->validated());

        $this->activityLog->log(
            $request->user()->id,
            'admin.user_updated',
            'admin',
            'User',
            (string) $user->id,
            $request->validated(),
            true,
            $user->id,
            $request,
        );

        return response()->json($user);
    }
}
