<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFriendRequest;
use App\Http\Requests\UpdateFriendRequest;
use App\Models\Friendship;
use App\Models\Notification;
use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FriendController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $friends = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($userId): void {
                $query->where('requester_id', $userId)->orWhere('addressee_id', $userId);
            })
            ->with(['requester', 'addressee'])
            ->get();

        return response()->json($friends);
    }

    public function store(StoreFriendRequest $request): JsonResponse
    {
        $user = $request->user();
        $addresseeId = $request->integer('addressee_id');

        if ($user->id === $addresseeId) {
            return response()->json(['message' => 'You cannot send a friend request to yourself.'], 422);
        }

        $existing = Friendship::query()
            ->where(function ($query) use ($user, $addresseeId): void {
                $query->where('requester_id', $user->id)->where('addressee_id', $addresseeId);
            })
            ->orWhere(function ($query) use ($user, $addresseeId): void {
                $query->where('requester_id', $addresseeId)->where('addressee_id', $user->id);
            })
            ->first();

        if ($existing) {
            return response()->json(['message' => 'Friendship already exists.'], 422);
        }

        $acceptedFriendCount = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($user): void {
                $query->where('requester_id', $user->id)->orWhere('addressee_id', $user->id);
            })
            ->count();

        if ($acceptedFriendCount >= $user->maxFriends()) {
            return response()->json(['message' => 'Friend limit reached for your subscription tier.'], 422);
        }

        $friendship = Friendship::query()->create([
            'requester_id' => $user->id,
            'addressee_id' => $addresseeId,
            'status' => 'pending',
        ]);

        Notification::query()->create([
            'user_id' => $addresseeId,
            'sender_id' => $user->id,
            'type' => 'friend_request',
            'title' => 'New friend request',
            'message' => $user->name.' sent you a friend request.',
            'resource_type' => 'Friendship',
            'resource_id' => $friendship->id,
        ]);

        $this->activityLog->log($user->id, 'friend.requested', 'user', 'Friendship', $friendship->id, null, false, $addresseeId, $request);

        return response()->json($friendship, 201);
    }

    public function update(UpdateFriendRequest $request, Friendship $friendship): JsonResponse
    {
        $this->authorize('update', $friendship);

        $friendship->update([
            'status' => $request->input('status'),
            'responded_at' => now(),
        ]);

        if ($request->input('status') === 'accepted') {
            Notification::query()->create([
                'user_id' => $friendship->requester_id,
                'sender_id' => $friendship->addressee_id,
                'type' => 'friend_accepted',
                'title' => 'Friend request accepted',
                'message' => $request->user()->name.' accepted your friend request.',
                'resource_type' => 'Friendship',
                'resource_id' => $friendship->id,
            ]);
        }

        $this->activityLog->log($request->user()->id, 'friend.'.$request->input('status'), 'user', 'Friendship', $friendship->id, null, false, null, $request);

        return response()->json($friendship);
    }

    public function destroy(Request $request, Friendship $friendship): JsonResponse
    {
        $this->authorize('delete', $friendship);

        $friendship->delete();

        $this->activityLog->log($request->user()->id, 'friend.removed', 'user', 'Friendship', $friendship->id, null, false, null, $request);

        return response()->json(null, 204);
    }

    public function search(Request $request): JsonResponse
    {
        $request->validate(['email' => ['required', 'email']]);

        $user = User::query()
            ->where('email', $request->input('email'))
            ->where('id', '!=', $request->user()->id)
            ->first();

        if (! $user) {
            return response()->json(['user' => null]);
        }

        $friendship = Friendship::query()
            ->where(function ($query) use ($request, $user): void {
                $query->where('requester_id', $request->user()->id)->where('addressee_id', $user->id);
            })
            ->orWhere(function ($query) use ($request, $user): void {
                $query->where('requester_id', $user->id)->where('addressee_id', $request->user()->id);
            })
            ->first();

        return response()->json([
            'user' => $user->only(['id', 'name', 'email']),
            'friendship' => $friendship,
        ]);
    }
}
