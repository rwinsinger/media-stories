<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class TrackLastLogin
{
    public function handle(Request $request, Closure $next): Response
    {
        if ($request->user()) {
            $request->user()->updateQuietly(['last_login_at' => now()]);
        }

        return $next($request);
    }
}
