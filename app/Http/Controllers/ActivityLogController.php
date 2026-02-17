<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ActivityLogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = $request->user()
            ->activityLogs()
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($logs);
    }
}
