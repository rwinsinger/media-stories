import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { ActivityLog, BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Activity Logs', href: '/admin/logs' },
];

export default function AdminLogs() {
    const [logs, setLogs] = useState<ActivityLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [category, setCategory] = useState('');

    const fetchLogs = (cat = category) => {
        const params = new URLSearchParams();
        if (cat) { params.set('category', cat); }
        fetch(`/api/admin/logs?${params}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setLogs(data.data ?? []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => { fetchLogs(); }, []);

    const formatDate = (d: string) => new Date(d).toLocaleString();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Logs" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Activity Logs</h1>

                <div className="mb-4 flex gap-3">
                    <select
                        value={category}
                        onChange={(e) => { setCategory(e.target.value); fetchLogs(e.target.value); }}
                        className="rounded-md border px-3 py-2 text-sm"
                    >
                        <option value="">All categories</option>
                        <option value="story">Story</option>
                        <option value="auth">Auth</option>
                        <option value="admin">Admin</option>
                        <option value="subscription">Subscription</option>
                    </select>
                </div>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 8 }).map((_, i) => (
                            <div key={i} className="h-10 animate-pulse rounded border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-lg border">
                        <table className="w-full text-sm">
                            <thead className="border-b bg-muted/50">
                                <tr>
                                    <th className="px-4 py-2 text-left">Time</th>
                                    <th className="px-4 py-2 text-left">User</th>
                                    <th className="px-4 py-2 text-left">Action</th>
                                    <th className="px-4 py-2 text-left">Category</th>
                                    <th className="px-4 py-2 text-left">Resource</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logs.map((log: ActivityLog) => (
                                    <tr key={log.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="px-4 py-2 text-xs text-muted-foreground">{formatDate(log.created_at)}</td>
                                        <td className="px-4 py-2">{log.user?.name ?? `#${log.user_id}`}</td>
                                        <td className="px-4 py-2 font-mono text-xs">{log.action}</td>
                                        <td className="px-4 py-2">
                                            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{log.action_category}</span>
                                        </td>
                                        <td className="px-4 py-2 text-xs text-muted-foreground">
                                            {log.resource_type && `${log.resource_type}:${log.resource_id?.slice(0, 8)}`}
                                        </td>
                                    </tr>
                                ))}
                                {logs.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No logs found</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
