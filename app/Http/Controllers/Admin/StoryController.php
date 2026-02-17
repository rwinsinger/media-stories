<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class StoryController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(Request $request): JsonResponse
    {
        $stories = Story::query()
            ->with('user')
            ->when($request->input('search'), function ($query, $search): void {
                $query->where('title', 'like', "%{$search}%");
            })
            ->orderByDesc('created_at')
            ->paginate(25);

        return response()->json($stories);
    }

    public function update(Request $request, Story $story): JsonResponse
    {
        $request->validate([
            'is_featured' => ['sometimes', 'boolean'],
            'is_flagged' => ['sometimes', 'boolean'],
        ]);

        $story->update($request->only(['is_featured', 'is_flagged']));

        $this->activityLog->log(
            $request->user()->id,
            'admin.story_updated',
            'admin',
            'Story',
            $story->id,
            $request->only(['is_featured', 'is_flagged']),
            true,
            $story->user_id,
            $request,
        );

        return response()->json($story);
    }

    public function destroy(Request $request, Story $story): JsonResponse
    {
        $this->activityLog->log(
            $request->user()->id,
            'admin.story_deleted',
            'admin',
            'Story',
            $story->id,
            ['title' => $story->title],
            true,
            $story->user_id,
            $request,
        );

        $story->delete();

        return response()->json(null, 204);
    }
}
