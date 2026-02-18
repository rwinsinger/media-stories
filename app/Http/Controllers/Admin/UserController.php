<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\Friendship;
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

        $stories = $user->stories()
            ->orderByDesc('created_at')
            ->get(['id', 'title', 'is_published', 'is_featured', 'is_flagged', 'frame_count', 'view_count', 'created_at']);

        $friends = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($q) use ($user): void {
                $q->where('requester_id', $user->id)
                    ->orWhere('addressee_id', $user->id);
            })
            ->with(['requester:id,name,email', 'addressee:id,name,email'])
            ->get()
            ->map(fn ($f) => $f->requester_id === $user->id ? $f->addressee : $f->requester)
            ->values();

        return response()->json([
            'user' => $user,
            'story_count' => $stories->count(),
            'stories' => $stories,
            'friends' => $friends,
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
