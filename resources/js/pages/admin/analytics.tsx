import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Analytics', href: '/admin/analytics' },
];

interface Analytics {
    total_users: number;
    premium_users: number;
    total_stories: number;
    total_frames: number;
    new_users_today: number;
    new_stories_today: number;
}

export default function AdminAnalytics() {
    const [stats, setStats] = useState<Analytics | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/admin/analytics', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setStats(data); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const statCards = stats ? [
        { label: 'Total Users', value: stats.total_users },
        { label: 'Premium Users', value: stats.premium_users },
        { label: 'Total Stories', value: stats.total_stories },
        { label: 'Total Frames', value: stats.total_frames },
        { label: 'New Users Today', value: stats.new_users_today },
        { label: 'New Stories Today', value: stats.new_stories_today },
    ] : [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Analytics" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Analytics</h1>
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-3">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-3">
                        {statCards.map((stat) => (
                            <div key={stat.label} className="rounded-lg border p-4">
                                <p className="text-sm text-muted-foreground">{stat.label}</p>
                                <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
