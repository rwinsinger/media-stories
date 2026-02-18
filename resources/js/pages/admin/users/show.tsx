import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import type { BreadcrumbItem, Story, User } from '@/types';

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

interface FriendUser {
    id: number;
    name: string;
    email: string;
}

interface UserDetail {
    user: User;
    story_count: number;
    stories: Story[];
    friends: FriendUser[];
    activity_logs: ActivityLog[];
}

type Tab = 'overview' | 'stories' | 'friends';

interface Props {
    userId: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin' },
    { title: 'Users', href: '/admin/users' },
    { title: 'User Detail', href: '#' },
];

const statusColors: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    cancelled: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    expired: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
};

export default function AdminUserShow({ userId }: Props) {
    const [detail, setDetail] = useState<UserDetail | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<Tab>('overview');

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
            <AdminLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-20 animate-pulse rounded-lg border bg-muted" />
                    ))}
                </div>
            </AdminLayout>
        );
    }

    if (!detail) {
        return (
            <AdminLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 text-muted-foreground">User not found.</div>
            </AdminLayout>
        );
    }

    const { user, stories, friends, activity_logs } = detail;

    const tabs: { id: Tab; label: string; count?: number }[] = [
        { id: 'overview', label: 'Overview' },
        { id: 'stories', label: 'Stories', count: stories.length },
        { id: 'friends', label: 'Friends', count: friends.length },
    ];

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title={`Admin — ${user.name}`} />
            <div className="p-6 space-y-6">

                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{user.name}</h1>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                    </div>
                    <button
                        onClick={() => router.visit('/admin/users')}
                        className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors"
                    >
                        ← Back to Users
                    </button>
                </div>

                <div className="grid gap-6 lg:grid-cols-3">

                    {/* Left — tabbed content */}
                    <div className="lg:col-span-2 space-y-4">

                        {/* Tabs */}
                        <div className="flex gap-1 border-b">
                            {tabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                                        activeTab === tab.id
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-muted-foreground hover:text-foreground'
                                    }`}
                                >
                                    {tab.label}
                                    {tab.count !== undefined && (
                                        <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-xs">
                                            {tab.count}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* Overview tab */}
                        {activeTab === 'overview' && (
                            <div className="space-y-4">
                                {/* Profile */}
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <h2 className="mb-4 font-semibold">Profile</h2>
                                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                        <div>
                                            <dt className="text-muted-foreground">Email</dt>
                                            <dd className="font-medium">{user.email}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Status</dt>
                                            <dd className="flex flex-wrap gap-1 mt-0.5">
                                                {user.is_suspended ? (
                                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Suspended</span>
                                                ) : (
                                                    <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                                                )}
                                                {user.is_admin && (
                                                    <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">Admin</span>
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
                                        <div>
                                            <dt className="text-muted-foreground">Stories</dt>
                                            <dd className="font-medium">{stories.length}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Friends</dt>
                                            <dd className="font-medium">{friends.length}</dd>
                                        </div>
                                    </dl>
                                </div>

                                {/* Subscription */}
                                <div className="rounded-xl border bg-card p-5 shadow-sm">
                                    <h2 className="mb-4 font-semibold">Subscription</h2>
                                    <dl className="grid gap-3 text-sm sm:grid-cols-2">
                                        <div>
                                            <dt className="text-muted-foreground">Tier</dt>
                                            <dd className="font-medium capitalize">{user.subscription_tier}</dd>
                                        </div>
                                        <div>
                                            <dt className="text-muted-foreground">Status</dt>
                                            <dd>
                                                <span className={`rounded-full px-2 py-0.5 text-xs capitalize ${statusColors[user.subscription_status] ?? ''}`}>
                                                    {user.subscription_status}
                                                </span>
                                            </dd>
                                        </div>
                                        {user.subscription_id && (
                                            <div className="sm:col-span-2">
                                                <dt className="text-muted-foreground">Stripe Subscription ID</dt>
                                                <dd className="font-mono text-xs break-all">{user.subscription_id}</dd>
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
                        )}

                        {/* Stories tab */}
                        {activeTab === 'stories' && (
                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                {stories.length === 0 ? (
                                    <p className="p-6 text-sm text-muted-foreground">No stories yet.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                <th className="px-4 py-3">Title</th>
                                                <th className="px-4 py-3">Frames</th>
                                                <th className="px-4 py-3">Views</th>
                                                <th className="px-4 py-3">Status</th>
                                                <th className="px-4 py-3">Created</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {stories.map((story) => (
                                                <tr key={story.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium max-w-48 truncate">{story.title}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{story.frame_count}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{story.view_count}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex flex-wrap gap-1">
                                                            <span className={`rounded-full px-2 py-0.5 text-xs ${story.is_published ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                                                                {story.is_published ? 'Published' : 'Draft'}
                                                            </span>
                                                            {story.is_featured && (
                                                                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Featured</span>
                                                            )}
                                                            {story.is_flagged && (
                                                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700 dark:bg-red-900/30 dark:text-red-400">Flagged</span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                                                        {new Date(story.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}

                        {/* Friends tab */}
                        {activeTab === 'friends' && (
                            <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                                {friends.length === 0 ? (
                                    <p className="p-6 text-sm text-muted-foreground">No friends yet.</p>
                                ) : (
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                                <th className="px-4 py-3">Name</th>
                                                <th className="px-4 py-3">Email</th>
                                                <th className="px-4 py-3">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y">
                                            {friends.map((friend) => (
                                                <tr key={friend.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="px-4 py-3 font-medium">{friend.name}</td>
                                                    <td className="px-4 py-3 text-muted-foreground">{friend.email}</td>
                                                    <td className="px-4 py-3">
                                                        <button
                                                            onClick={() => router.visit(`/admin/users/${friend.id}`)}
                                                            className="text-xs text-primary hover:underline"
                                                        >
                                                            View Profile
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Right — actions sidebar */}
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
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
                        </div>

                        {/* Subscription management */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-3">
                            <h2 className="font-semibold">Subscription</h2>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Tier</label>
                                <select
                                    value={user.subscription_tier}
                                    onChange={(e) => void updateUser({ subscription_tier: e.target.value as User['subscription_tier'] })}
                                    disabled={isSaving}
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                >
                                    <option value="free">Free</option>
                                    <option value="premium">Premium</option>
                                </select>
                            </div>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Status</label>
                                <select
                                    value={user.subscription_status}
                                    onChange={(e) => void updateUser({ subscription_status: e.target.value as User['subscription_status'] })}
                                    disabled={isSaving}
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                                >
                                    <option value="active">Active</option>
                                    <option value="cancelled">Cancelled</option>
                                    <option value="expired">Expired</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
