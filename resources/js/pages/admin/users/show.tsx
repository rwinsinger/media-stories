import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User } from '@/types';

interface ActivityLog {
    id: string;
    action: string;
    action_category: string;
    resource_type: string | null;
    resource_id: string | null;
    ip_address: string | null;
    created_at: string;
    is_admin_action: boolean;
}

interface UserDetail {
    user: User;
    story_count: number;
    activity_logs: ActivityLog[];
}

interface Props {
    userId: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Users', href: '/admin/users' },
    { title: 'User Detail', href: '#' },
];

export default function AdminUserShow({ userId }: Props) {
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const fetchUser = () => {
        fetch(`/api/admin/users/${userId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data: UserDetail) => { setDetail(data); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => { fetchUser(); }, [userId]);

    const updateUser = async (changes: Partial<User>) => {
        if (!detail) return;
        setIsSaving(true);
        try {
            const r = await fetch(`/api/admin/users/${userId}`, {
                method: 'PUT',
                headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
                body: JSON.stringify(changes),
            });
            if (r.ok) {
                const updated = await r.json() as User;
                setDetail((prev) => prev ? { ...prev, user: updated } : prev);
            }
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
                    ))}
                </div>
            </AppLayout>
        );
    }

    if (!detail) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 text-muted-foreground">User not found.</div>
            </AppLayout>
        );
    }

    const { user, story_count, activity_logs } = detail;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Admin — ${user.name}`} />
            <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">{user.name}</h1>
                    <button onClick={() => router.visit('/admin/users')} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors">
                        ← Back to Users
                    </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Profile info */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 font-semibold">Profile</h2>
                            <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                <div>
                                    <dt className="text-muted-foreground">Email</dt>
                                    <dd className="font-medium">{user.email}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Subscription</dt>
                                    <dd className="font-medium capitalize">{user.subscription_tier}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Stories</dt>
                                    <dd className="font-medium">{story_count}</dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Status</dt>
                                    <dd>
                                        {user.is_suspended ? (
                                            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Suspended</span>
                                        ) : (
                                            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                                        )}
                                        {user.is_admin && (
                                            <span className="ml-1 rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Admin</span>
                                        )}
                                    </dd>
                                </div>
                                <div>
                                    <dt className="text-muted-foreground">Joined</dt>
                                    <dd className="font-medium">{new Date(user.created_at).toLocaleDateString()}</dd>
                                </div>
                                {user.last_login_at && (
                                    <div>
                                        <dt className="text-muted-foreground">Last Login</dt>
                                        <dd className="font-medium">{new Date(user.last_login_at).toLocaleString()}</dd>
                                    </div>
                                )}
                            </dl>
                        </div>

                        {/* Activity log */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 font-semibold">Recent Activity ({activity_logs.length})</h2>
                            {activity_logs.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No activity recorded.</p>
                            ) : (
                                <div className="space-y-2 max-h-80 overflow-y-auto">
                                    {activity_logs.map((log) => (
                                        <div key={log.id} className="flex items-start gap-3 rounded-lg border bg-background px-3 py-2 text-sm">
                                            <span className="mt-0.5 shrink-0 text-muted-foreground">{log.is_admin_action ? '🔑' : '◦'}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-mono text-xs">{log.action}</p>
                                                {log.resource_type && (
                                                    <p className="text-xs text-muted-foreground">{log.resource_type} {log.resource_id}</p>
                                                )}
                                            </div>
                                            <time className="shrink-0 text-xs text-muted-foreground">
                                                {new Date(log.created_at).toLocaleDateString()}
                                            </time>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Actions sidebar */}
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                            <h2 className="font-semibold">Actions</h2>

                            {/* Suspend / unsuspend */}
                            <button
                                disabled={isSaving}
                                onClick={() => void updateUser({ is_suspended: !user.is_suspended })}
                                className={`w-full rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${user.is_suspended ? 'border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:hover:bg-emerald-900/20' : 'border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20'}`}
                            >
                                {user.is_suspended ? 'Unsuspend User' : 'Suspend User'}
                            </button>

                            {/* Toggle admin */}
                            <button
                                disabled={isSaving}
                                onClick={() => void updateUser({ is_admin: !user.is_admin })}
                                className="w-full rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                {user.is_admin ? 'Remove Admin Role' : 'Grant Admin Role'}
                            </button>

                            {/* Change subscription tier */}
                            <div>
                                <label className="mb-1 block text-sm font-medium">Subscription Tier</label>
                                <select
                                    value={user.subscription_tier}
                                    onChange={(e) => void updateUser({ subscription_tier: e.target.value })}
                                    disabled={isSaving}
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                >
                                    <option value="free">Free</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
