import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import type { BreadcrumbItem, SiteConfig } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Config', href: '/admin/config' },
];

export default function AdminConfig() {
    const [configs, setConfigs] = useState<SiteConfig[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [editing, setEditing] = useState<Record<string, string>>({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/admin/config', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setConfigs(Array.isArray(data) ? data : []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const handleChange = (key: string, value: string) => {
        setEditing((prev) => ({ ...prev, [key]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        const updates = Object.entries(editing).map(([key, value]) => ({
            key,
            value: isNaN(Number(value)) ? value : Number(value),
        }));
        await fetch('/api/admin/config', {
            method: 'PUT',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            body: JSON.stringify({ updates }),
        });
        setEditing({});
        setSaving(false);
    };

    const getValue = (config: SiteConfig) => {
        if (config.key in editing) { return editing[config.key]; }
        return config.value === null ? '' : String(config.value);
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Site Config" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Site Configuration</h1>
                    {Object.keys(editing).length > 0 && (
                        <button
                            onClick={() => void handleSave()}
                            disabled={saving}
                            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    )}
                </div>

                {isLoading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {configs.map((config: SiteConfig) => (
                            <div key={config.key} className="rounded-lg border p-4">
                                <label className="mb-1 block font-mono text-sm font-medium">{config.key}</label>
                                <input
                                    type="text"
                                    value={getValue(config)}
                                    onChange={(e) => handleChange(config.key, e.target.value)}
                                    className={`w-full rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary ${config.key in editing ? 'border-primary' : ''}`}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
