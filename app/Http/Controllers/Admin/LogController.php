<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LogController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $logs = ActivityLog::query()
            ->with(['user', 'targetUser'])
            ->when($request->input('category'), fn ($query, $category) => $query->where('action_category', $category))
            ->when($request->input('user_email'), function ($query, $email): void {
                $query->whereHas('user', fn ($q) => $q->where('email', 'like', "%{$email}%"));
            })
            ->when($request->input('from'), fn ($query, $from) => $query->whereDate('created_at', '>=', $from))
            ->when($request->input('to'), fn ($query, $to) => $query->whereDate('created_at', '<=', $to))
            ->orderByDesc('created_at')
            ->paginate(50);

        return response()->json($logs);
    }
}
