import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { Auth, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Subscription', href: '/subscription' },
];

const FEATURES = {
    free: ['Up to 5 stories', 'Up to 30 friends', '3 shares per story', 'Basic frame editor'],
    premium: ['Unlimited stories', 'Unlimited friends', 'Unlimited shares', 'Advanced frame editor', 'Priority support'],
};

export default function SubscriptionIndex() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const isPremium = user.subscription_tier === 'premium';
    const [isLoading, setIsLoading] = useState(false);

    const handleCheckout = async () => {
        setIsLoading(true);
        const res = await fetch('/api/stripe/checkout', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; }
        setIsLoading(false);
    };

    const handlePortal = async () => {
        setIsLoading(true);
        const res = await fetch('/api/stripe/portal', {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
        });
        const data = await res.json();
        if (data.url) { window.location.href = data.url; }
        setIsLoading(false);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Subscription" />
            <div className="mx-auto max-w-3xl p-6">
                <h1 className="mb-2 text-2xl font-bold">Subscription</h1>
                <p className="mb-8 text-muted-foreground">
                    Current plan: <span className="font-medium capitalize">{user.subscription_tier}</span>
                    {isPremium && user.subscription_status && (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700 capitalize">
                            {user.subscription_status}
                        </span>
                    )}
                </p>

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Free */}
                    <div className={`rounded-lg border p-6 ${!isPremium ? 'border-primary ring-2 ring-primary' : ''}`}>
                        <div className="mb-4">
                            <h2 className="text-lg font-bold">Free</h2>
                            <p className="text-3xl font-bold">$0<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                        </div>
                        <ul className="mb-6 space-y-2">
                            {FEATURES.free.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm">
                                    <span className="text-green-500">✓</span> {f}
                                </li>
                            ))}
                        </ul>
                        {!isPremium && (
                            <span className="block text-center text-sm text-muted-foreground">Current plan</span>
                        )}
                    </div>

                    {/* Premium */}
                    <div className={`rounded-lg border p-6 ${isPremium ? 'border-primary ring-2 ring-primary' : ''}`}>
                        <div className="mb-4">
                            <h2 className="text-lg font-bold">Premium</h2>
                            <p className="text-3xl font-bold">$9<span className="text-base font-normal text-muted-foreground">/mo</span></p>
                        </div>
                        <ul className="mb-6 space-y-2">
                            {FEATURES.premium.map((f) => (
                                <li key={f} className="flex items-center gap-2 text-sm">
                                    <span className="text-green-500">✓</span> {f}
                                </li>
                            ))}
                        </ul>
                        {isPremium ? (
                            <button
                                onClick={() => void handlePortal()}
                                disabled={isLoading}
                                className="w-full rounded-md border px-4 py-2 hover:bg-accent disabled:opacity-50"
                            >
                                {isLoading ? 'Loading...' : 'Manage Billing'}
                            </button>
                        ) : (
                            <button
                                onClick={() => void handleCheckout()}
                                disabled={isLoading}
                                className="w-full rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                            >
                                {isLoading ? 'Loading...' : 'Upgrade to Premium'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
