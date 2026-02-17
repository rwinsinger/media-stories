<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreShareLinkRequest;
use App\Models\ShareLink;
use App\Models\Story;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;

class ShareLinkController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function store(StoreShareLinkRequest $request): JsonResponse
    {
        $story = Story::query()->findOrFail($request->input('story_id'));

        $this->authorize('update', $story);

        $shareLink = $story->shareLinks()->create([]);

        $this->activityLog->log(
            $request->user()->id,
            'share_link.created',
            'share',
            'ShareLink',
            $shareLink->id,
            ['story_id' => $story->id],
            false,
            null,
            $request,
        );

        return response()->json([
            'token' => $shareLink->token,
            'url' => route('share.show', $shareLink->token),
            'expires_at' => $shareLink->expires_at,
        ], 201);
    }

    public function show(string $token): JsonResponse
    {
        $shareLink = ShareLink::query()->where('token', $token)->firstOrFail();

        if ($shareLink->isExpired()) {
            return response()->json(['message' => 'This share link has expired.'], 410);
        }

        if ($shareLink->isExhausted()) {
            return response()->json(['message' => 'This share link has reached its maximum view count.'], 410);
        }

        $shareLink->increment('view_count');
        Story::query()->where('id', $shareLink->story_id)->increment('view_count');

        $story = $shareLink->story()->with('frames')->first();

        return response()->json([
            'story' => $story,
            'share_link' => $shareLink,
        ]);
    }
}
