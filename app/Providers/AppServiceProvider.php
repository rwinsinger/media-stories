<?php

namespace App\Providers;

use App\Models\Frame;
use App\Models\User;
use App\Observers\FrameObserver;
use Carbon\CarbonImmutable;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void {}

    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureGate();
        $this->configureObservers();
        $this->configureRateLimiters();
    }

    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null
        );
    }

    protected function configureGate(): void
    {
        Gate::before(function (User $user, string $ability): ?bool {
            if ($user->is_admin) {
                return true;
            }

            return null;
        });
    }

    protected function configureObservers(): void
    {
        Frame::observe(FrameObserver::class);
    }

    protected function configureRateLimiters(): void
    {
        RateLimiter::for('friend-requests', function (Request $request) {
            $limit = $request->user()?->subscription_tier === 'premium' ? 50 : 10;

            return Limit::perHour($limit)->by($request->user()?->id);
        });
    }
}
