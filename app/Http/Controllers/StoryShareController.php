<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStoryShareRequest;
use App\Models\Friendship;
use App\Models\Notification;
use App\Models\Story;
use App\Models\StoryShare;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryShareController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(Request $request): JsonResponse
    {
        $userId = $request->user()->id;

        $shares = StoryShare::query()
            ->where(function ($query) use ($userId): void {
                $query->where('shared_by_user_id', $userId)->orWhere('shared_with_user_id', $userId);
            })
            ->with(['story', 'sharedBy', 'sharedWith'])
            ->orderByDesc('shared_at')
            ->get();

        return response()->json($shares);
    }

    public function store(StoreStoryShareRequest $request): JsonResponse
    {
        $user = $request->user();
        $story = Story::query()->findOrFail($request->input('story_id'));

        if ($story->user_id !== $user->id) {
            return response()->json(['message' => 'You can only share your own stories.'], 403);
        }

        $sharedWithUserId = $request->integer('shared_with_user_id');

        $areFriends = Friendship::query()
            ->where('status', 'accepted')
            ->where(function ($query) use ($user, $sharedWithUserId): void {
                $query->where('requester_id', $user->id)->where('addressee_id', $sharedWithUserId);
            })
            ->orWhere(function ($query) use ($user, $sharedWithUserId): void {
                $query->where('requester_id', $sharedWithUserId)->where('addressee_id', $user->id)->where('status', 'accepted');
            })
            ->exists();

        if (! $areFriends) {
            return response()->json(['message' => 'You can only share stories with accepted friends.'], 422);
        }

        $shareCount = $story->storyShares()->where('is_revoked', false)->count();
        if ($shareCount >= $user->maxSharesPerStory()) {
            return response()->json(['message' => 'Share limit reached for your subscription tier.'], 422);
        }

        $expiresAt = $request->input('expires_in_days')
            ? now()->addDays($request->integer('expires_in_days'))
            : null;

        $share = StoryShare::query()->create([
            'story_id' => $story->id,
            'shared_by_user_id' => $user->id,
            'shared_with_user_id' => $sharedWithUserId,
            'permission_level' => $request->input('permission_level', 'view'),
            'message' => $request->input('message'),
            'expires_at' => $expiresAt,
        ]);

        Notification::query()->create([
            'user_id' => $sharedWithUserId,
            'sender_id' => $user->id,
            'type' => 'story_shared',
            'title' => 'A story was shared with you',
            'message' => $user->name.' shared "'.$story->title.'" with you.',
            'resource_type' => 'StoryShare',
            'resource_id' => $share->id,
        ]);

        $this->activityLog->log($user->id, 'story.shared', 'share', 'StoryShare', $share->id, ['story_id' => $story->id], false, $sharedWithUserId, $request);

        return response()->json($share->load(['story', 'sharedBy', 'sharedWith']), 201);
    }

    public function destroy(Request $request, StoryShare $storyShare): JsonResponse
    {
        $this->authorize('delete', $storyShare);

        $storyShare->update([
            'is_revoked' => true,
            'revoked_at' => now(),
        ]);

        $this->activityLog->log($request->user()->id, 'story.share_revoked', 'share', 'StoryShare', $storyShare->id, null, false, null, $request);

        return response()->json(null, 204);
    }

    public function trackView(Request $request, StoryShare $storyShare): JsonResponse
    {
        $this->authorize('view', $storyShare);

        $storyShare->increment('view_count');
        $storyShare->update(['last_viewed_at' => now()]);

        Story::query()->where('id', $storyShare->story_id)->increment('view_count');

        return response()->json(['message' => 'View tracked.']);
    }
}
