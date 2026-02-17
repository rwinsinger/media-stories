<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Story;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AnalyticsController extends Controller
{
    public function index(): JsonResponse
    {
        $totalUsers = User::query()->count();
        $totalStories = Story::query()->count();
        $activeUsersToday = User::query()
            ->whereDate('last_login_at', today())
            ->count();

        $tierBreakdown = User::query()
            ->select('subscription_tier', DB::raw('count(*) as count'))
            ->groupBy('subscription_tier')
            ->pluck('count', 'subscription_tier');

        return response()->json([
            'total_users' => $totalUsers,
            'total_stories' => $totalStories,
            'active_users_today' => $activeUsersToday,
            'tier_breakdown' => $tierBreakdown,
        ]);
    }
}
