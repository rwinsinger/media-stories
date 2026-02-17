<?php

namespace App\Http\Controllers;

use App\Services\ActivityLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Stripe\Stripe;

class StripeController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function checkout(Request $request): JsonResponse
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $session = \Stripe\Checkout\Session::create([
            'mode' => 'subscription',
            'line_items' => [[
                'price' => config('services.stripe.premium_price_id'),
                'quantity' => 1,
            ]],
            'success_url' => url('/subscription?success=1'),
            'cancel_url' => url('/subscription?cancelled=1'),
            'metadata' => ['user_id' => $request->user()->id],
        ]);

        $this->activityLog->log(
            $request->user()->id,
            'subscription.checkout_started',
            'subscription',
            null,
            null,
            null,
            false,
            null,
            $request,
        );

        return response()->json(['url' => $session->url]);
    }

    public function portal(Request $request): JsonResponse
    {
        Stripe::setApiKey(config('services.stripe.secret'));

        $user = $request->user();

        if (! $user->subscription_id) {
            return response()->json(['message' => 'No active subscription found.'], 422);
        }

        $session = \Stripe\BillingPortal\Session::create([
            'customer' => $user->subscription_id,
            'return_url' => url('/subscription'),
        ]);

        return response()->json(['url' => $session->url]);
    }
}
