<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSuspended
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()?->is_suspended) {
            return response()->json([
                'message' => 'Account suspended: '.$request->user()->suspended_reason,
            ], 403);
        }

        return $next($request);
    }
}
