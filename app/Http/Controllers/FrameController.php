<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreFrameRequest;
use App\Http\Requests\UpdateFrameRequest;
use App\Models\Frame;
use App\Models\Story;
use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FrameController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function index(Request $request, Story $story): JsonResponse
    {
        $this->authorize('view', $story);

        return response()->json($story->frames);
    }

    public function store(StoreFrameRequest $request, Story $story): JsonResponse
    {
        $this->authorize('update', $story);

        if ($story->frame_count >= 100) {
            return response()->json([
                'message' => 'Maximum of 100 frames per story reached.',
            ], 422);
        }

        $frame = $story->frames()->create($request->validated());

        $this->activityLog->log(
            $request->user()->id,
            'frame.created',
            'story',
            'Frame',
            $frame->id,
            ['story_id' => $story->id],
            false,
            null,
            $request,
        );

        return response()->json($frame, 201);
    }

    public function show(Request $request, Frame $frame): JsonResponse
    {
        $this->authorize('view', $frame);

        return response()->json($frame);
    }

    public function update(UpdateFrameRequest $request, Frame $frame): JsonResponse
    {
        $this->authorize('update', $frame);

        $frame->update($request->validated());

        return response()->json($frame);
    }

    public function destroy(Request $request, Frame $frame): JsonResponse
    {
        $this->authorize('delete', $frame);

        $frame->delete();

        $this->activityLog->log(
            $request->user()->id,
            'frame.deleted',
            'story',
            'Frame',
            $frame->id,
            ['story_id' => $frame->story_id],
            false,
            null,
            $request,
        );

        return response()->json(null, 204);
    }
}
