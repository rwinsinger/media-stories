<?php

namespace App\Providers;

use App\Models\Frame;
use App\Models\Friendship;
use App\Models\Invitation;
use App\Models\User;
use App\Observers\FrameObserver;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Events\Registered;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
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

        if (app()->isLocal()) {
            Event::listen(Registered::class, function (Registered $event): void {
                $event->user->markEmailAsVerified();
            });
        }

        Event::listen(Registered::class, function (Registered $event): void {
            $newUser = $event->user;

            $invitation = Invitation::query()
                ->pending()
                ->where('email', $newUser->email)
                ->first();

            if (! $invitation) {
                return;
            }

            $alreadyFriends = Friendship::query()
                ->where(function ($query) use ($newUser, $invitation): void {
                    $query->where('requester_id', $invitation->invited_by)->where('addressee_id', $newUser->id);
                })
                ->orWhere(function ($query) use ($newUser, $invitation): void {
                    $query->where('requester_id', $newUser->id)->where('addressee_id', $invitation->invited_by);
                })
                ->exists();

            if (! $alreadyFriends) {
                Friendship::query()->create([
                    'requester_id' => $invitation->invited_by,
                    'addressee_id' => $newUser->id,
                    'status' => 'accepted',
                    'requested_at' => now(),
                    'responded_at' => now(),
                ]);
            }

            $invitation->update(['accepted_at' => now()]);
        });
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
