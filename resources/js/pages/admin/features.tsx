import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, FeatureFlag } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Feature Flags', href: '/admin/features' },
];

export default function AdminFeatures() {
    const [flags, setFlags] = useState<FeatureFlag[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [saving, setSaving] = useState<string | null>(null);

    useEffect(() => {
        fetch('/api/admin/features', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setFlags(data); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const toggle = async (key: string, currentValue: boolean) => {
        setSaving(key);
        const res = await fetch(`/api/admin/features/${key}`, {
            method: 'PUT',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_enabled: !currentValue }),
        });
        if (res.ok) {
            setFlags((prev) => prev.map((f) => f.key === key ? { ...f, enabled: !currentValue } : f));
        }
        setSaving(null);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Feature Flags" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Feature Flags</h1>
                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {flags.map((flag: FeatureFlag) => (
                            <div key={flag.key} className="flex items-center justify-between rounded-lg border p-4">
                                <div>
                                    <p className="font-mono font-medium">{flag.key}</p>
                                    {flag.description && <p className="text-sm text-muted-foreground">{flag.description}</p>}
                                </div>
                                <button
                                    onClick={() => void toggle(flag.key, flag.enabled)}
                                    disabled={saving === flag.key}
                                    className={`relative h-6 w-11 rounded-full transition-colors ${flag.enabled ? 'bg-primary' : 'bg-muted'} disabled:opacity-50`}
                                >
                                    <span
                                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${flag.enabled ? 'left-5' : 'left-0.5'}`}
                                    />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
