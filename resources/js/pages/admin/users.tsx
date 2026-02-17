import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Users', href: '/admin/users' },
];

export default function AdminUsers() {
    const [users, setUsers] = useState<User[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [tier, setTier] = useState('');

    const fetchUsers = (s = search, t = tier) => {
        const params = new URLSearchParams();
        if (s) { params.set('search', s); }
        if (t) { params.set('tier', t); }
        fetch(`/api/admin/users?${params}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setUsers(data.data ?? []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => { fetchUsers(); }, []);

    const suspend = async (id: number, isSuspended: boolean) => {
        await fetch(`/api/admin/users/${id}`, {
            method: 'PUT',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_suspended: !isSuspended }),
        });
        fetchUsers();
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Users" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Users</h1>

                {/* Filters */}
                <div className="mb-4 flex gap-3">
                    <input
                        type="text"
                        placeholder="Search by name or email..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                        className="flex-1 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                    <select
                        value={tier}
                        onChange={(e) => { setTier(e.target.value); fetchUsers(search, e.target.value); }}
                        className="rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="">All tiers</option>
                        <option value="free">Free</option>
                        <option value="premium">Premium</option>
                    </select>
                    <button onClick={() => fetchUsers()} className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground">
                        Search
                    </button>
                </div>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 5 }).map((_, i) => (
                            <div key={i} className="h-12 animate-pulse rounded border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Name</th>
                                    <th className="px-4 py-2 text-left">Email</th>
                                    <th className="px-4 py-2 text-left">Tier</th>
                                    <th className="px-4 py-2 text-left">Stories</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((user: User) => (
                                    <tr key={user.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="px-4 py-2 font-medium">
                                            {user.name}
                                            {user.is_admin && <span className="ml-1 rounded-full bg-purple-100 px-1.5 py-0.5 text-xs text-purple-700">Admin</span>}
                                        </td>
                                        <td className="px-4 py-2 text-muted-foreground">{user.email}</td>
                                        <td className="px-4 py-2 capitalize">{user.subscription_tier}</td>
                                        <td className="px-4 py-2">{user.story_count}</td>
                                        <td className="px-4 py-2">
                                            {user.is_suspended ? (
                                                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Suspended</span>
                                            ) : (
                                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-2">
                                            <button
                                                onClick={() => void suspend(user.id, user.is_suspended)}
                                                className="rounded border px-2 py-1 text-xs hover:bg-accent"
                                            >
                                                {user.is_suspended ? 'Unsuspend' : 'Suspend'}
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
