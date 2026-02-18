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
            ->get()
            ->map(fn ($row) => ['name' => ucfirst($row->subscription_tier), 'value' => $row->count]);

        $userGrowth = User::query()
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'users' => $row->count]);

        $storyGrowth = Story::query()
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('count(*) as count'))
            ->where('created_at', '>=', now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get()
            ->map(fn ($row) => ['date' => $row->date, 'stories' => $row->count]);

        return response()->json([
            'total_users' => $totalUsers,
            'total_stories' => $totalStories,
            'active_users_today' => $activeUsersToday,
            'tier_breakdown' => $tierBreakdown,
            'user_growth' => $userGrowth,
            'story_growth' => $storyGrowth,
        ]);
    }
}
