import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Analytics', href: '/admin/analytics' },
];

interface TierRow {
    name: string;
    value: number;
}

interface GrowthRow {
    date: string;
    users?: number;
    stories?: number;
}

interface Analytics {
    total_users: number;
    total_stories: number;
    active_users_today: number;
    tier_breakdown: TierRow[];
    user_growth: GrowthRow[];
    story_growth: GrowthRow[];
}

const COLORS = ['#7c3aed', '#db2777', '#2563eb', '#16a34a'];

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
        { label: 'Total Stories', value: stats.total_stories },
        { label: 'Active Today', value: stats.active_users_today },
    ] : [];

    // Merge user_growth + story_growth by date for bar chart
    const growthData: GrowthRow[] = (() => {
        if (!stats) return [];
        const map = new Map<string, GrowthRow>();
        stats.user_growth.forEach((r) => { map.set(r.date, { date: r.date, users: r.users, stories: 0 }); });
        stats.story_growth.forEach((r) => {
            const existing = map.get(r.date);
            if (existing) { existing.stories = r.stories; } else { map.set(r.date, { date: r.date, users: 0, stories: r.stories }); }
        });
        return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    })();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Analytics" />
            <div className="p-6 space-y-8">
                <h1 className="text-2xl font-bold">Analytics</h1>

                {isLoading ? (
                    <div className="space-y-6">
                        <div className="grid gap-4 md:grid-cols-3">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
                            ))}
                        </div>
                        <div className="h-64 animate-pulse rounded-lg border bg-muted" />
                    </div>
                ) : (
                    <>
                        {/* Summary cards */}
                        <div className="grid gap-4 md:grid-cols-3">
                            {statCards.map((stat) => (
                                <div key={stat.label} className="rounded-xl border bg-card p-5 shadow-sm">
                                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                                    <p className="mt-1 text-3xl font-bold">{stat.value.toLocaleString()}</p>
                                </div>
                            ))}
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            {/* Subscription tier breakdown — Pie chart */}
                            <div className="rounded-xl border bg-card p-5 shadow-sm">
                                <h2 className="mb-4 font-semibold">Subscription Tiers</h2>
                                {stats?.tier_breakdown && stats.tier_breakdown.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <PieChart>
                                            <Pie
                                                data={stats.tier_breakdown}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                dataKey="value"
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                            >
                                                {stats.tier_breakdown.map((_, idx) => (
                                                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
                                )}
                            </div>

                            {/* Growth over last 30 days — Bar chart */}
                            <div className="rounded-xl border bg-card p-5 shadow-sm">
                                <h2 className="mb-4 font-semibold">Growth (Last 30 Days)</h2>
                                {growthData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={220}>
                                        <BarChart data={growthData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                                            <XAxis
                                                dataKey="date"
                                                tick={{ fontSize: 10 }}
                                                tickFormatter={(v: string) => v.slice(5)}
                                            />
                                            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                                            <Tooltip />
                                            <Legend />
                                            <Bar dataKey="users" name="New Users" fill="#7c3aed" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="stories" name="New Stories" fill="#db2777" radius={[3, 3, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <p className="py-8 text-center text-sm text-muted-foreground">No data yet</p>
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
