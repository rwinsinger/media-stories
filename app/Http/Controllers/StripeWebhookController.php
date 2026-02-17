<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\ActivityLogService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Stripe\Exception\SignatureVerificationException;
use Stripe\Webhook;

class StripeWebhookController extends Controller
{
    public function __construct(private readonly ActivityLogService $activityLog) {}

    public function handle(Request $request): Response
    {
        try {
            $event = Webhook::constructEvent(
                $request->getContent(),
                $request->header('Stripe-Signature'),
                config('services.stripe.webhook_secret')
            );
        } catch (SignatureVerificationException) {
            return response('Invalid signature', 400);
        }

        match ($event->type) {
            'checkout.session.completed' => $this->handleCheckoutCompleted($event->data->object),
            'customer.subscription.updated' => $this->handleSubscriptionUpdated($event->data->object),
            'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event->data->object),
            'invoice.payment_succeeded' => $this->handlePaymentSucceeded($event->data->object),
            'invoice.payment_failed' => $this->handlePaymentFailed($event->data->object),
            default => null,
        };

        return response('OK', 200);
    }

    private function handleCheckoutCompleted(object $session): void
    {
        $userId = $session->metadata->user_id ?? null;
        if (! $userId) {
            return;
        }

        $user = User::query()->find($userId);
        if (! $user) {
            return;
        }

        $user->update([
            'subscription_tier' => 'premium',
            'subscription_id' => $session->customer,
            'subscription_status' => 'active',
        ]);

        $this->activityLog->log($user->id, 'subscription.upgraded', 'subscription', 'User', (string) $user->id, ['tier' => 'premium']);
    }

    private function handleSubscriptionUpdated(object $subscription): void
    {
        $user = User::query()->where('subscription_id', $subscription->customer)->first();
        if (! $user) {
            return;
        }

        $user->update(['subscription_status' => $subscription->status]);
    }

    private function handleSubscriptionDeleted(object $subscription): void
    {
        $user = User::query()->where('subscription_id', $subscription->customer)->first();
        if (! $user) {
            return;
        }

        $user->update([
            'subscription_tier' => 'free',
            'subscription_status' => 'expired',
        ]);

        $this->activityLog->log($user->id, 'subscription.expired', 'subscription', 'User', (string) $user->id);
    }

    private function handlePaymentSucceeded(object $invoice): void
    {
        $user = User::query()->where('subscription_id', $invoice->customer)->first();
        if ($user) {
            $this->activityLog->log($user->id, 'subscription.payment_succeeded', 'subscription');
        }
    }

    private function handlePaymentFailed(object $invoice): void
    {
        $user = User::query()->where('subscription_id', $invoice->customer)->first();
        if ($user) {
            $this->activityLog->log($user->id, 'subscription.payment_failed', 'subscription');
        }
    }
}
