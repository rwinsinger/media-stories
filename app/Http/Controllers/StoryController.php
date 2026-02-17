<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreStoryRequest;
use App\Http\Requests\UpdateStoryRequest;
use App\Models\Story;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(Request $request): JsonResponse
    {
        $stories = $request->user()
            ->stories()
            ->orderByDesc('created_at')
            ->get();

        return response()->json($stories);
    }

    public function store(StoreStoryRequest $request): JsonResponse
    {
        $user = $request->user();
        $maxStories = $user->maxStories();

        if ($maxStories !== null && $user->story_count >= $maxStories) {
            return response()->json([
                'message' => 'Story limit reached for your subscription tier.',
            ], 422);
        }

        $story = $user->stories()->create($request->validated());
        $user->increment('story_count');

        $this->activityLog->log(
            $user->id,
            'story.created',
            'story',
            'Story',
            $story->id,
            ['title' => $story->title],
            false,
            null,
            $request,
        );

        return response()->json($story, 201);
    }

    public function show(Request $request, Story $story): JsonResponse
    {
        $this->authorize('view', $story);

        $story->load('frames');

        return response()->json($story);
    }

    public function update(UpdateStoryRequest $request, Story $story): JsonResponse
    {
        $this->authorize('update', $story);

        $story->update($request->validated());

        $this->activityLog->log(
            $request->user()->id,
            'story.updated',
            'story',
            'Story',
            $story->id,
            $request->validated(),
            false,
            null,
            $request,
        );

        return response()->json($story);
    }

    public function destroy(Request $request, Story $story): JsonResponse
    {
        $this->authorize('delete', $story);

        $story->delete();
        $request->user()->decrement('story_count');

        $this->activityLog->log(
            $request->user()->id,
            'story.deleted',
            'story',
            'Story',
            $story->id,
            ['title' => $story->title],
            false,
            null,
            $request,
        );

        return response()->json(null, 204);
    }

    public function flag(Request $request, Story $story): JsonResponse
    {
        $request->validate([
            'reason' => ['required', 'string', 'max:500'],
        ]);

        $story->update([
            'is_flagged' => true,
            'flagged_reason' => $request->input('reason'),
        ]);

        $this->activityLog->log(
            $request->user()->id,
            'story.flagged',
            'story',
            'Story',
            $story->id,
            ['reason' => $request->input('reason')],
            false,
            null,
            $request,
        );

        return response()->json(['message' => 'Story flagged for review.']);
    }
}
