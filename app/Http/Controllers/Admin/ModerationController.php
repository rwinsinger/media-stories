<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ModerationController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(): JsonResponse
    {
        $flaggedStories = Story::query()
            ->with('user')
            ->where('is_flagged', true)
            ->orderByDesc('updated_at')
            ->paginate(25);

        return response()->json($flaggedStories);
    }

    public function update(Request $request, Story $story): JsonResponse
    {
        $request->validate([
            'action' => ['required', 'in:unflag,delete'],
        ]);

        if ($request->input('action') === 'delete') {
            $this->activityLog->log(
                $request->user()->id,
                'admin.story_deleted_moderation',
                'admin',
                'Story',
                $story->id,
                ['title' => $story->title, 'flagged_reason' => $story->flagged_reason],
                true,
                $story->user_id,
                $request,
            );

            $story->delete();

            return response()->json(null, 204);
        }

        $story->update(['is_flagged' => false, 'flagged_reason' => null]);

        $this->activityLog->log(
            $request->user()->id,
            'admin.story_unflagged',
            'admin',
            'Story',
            $story->id,
            null,
            true,
            $story->user_id,
            $request,
        );

        return response()->json($story);
    }
}
