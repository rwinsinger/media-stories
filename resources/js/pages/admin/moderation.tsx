import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '@/layouts/admin-layout';
import type { BreadcrumbItem, Story } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Moderation', href: '/admin/moderation' },
];

export default function AdminModeration() {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchFlagged = () => {
        fetch('/api/admin/moderation', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setStories(data.data ?? []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => { fetchFlagged(); }, []);

    const moderate = async (id: string, action: 'unflag' | 'delete') => {
        if (action === 'delete' && !confirm('Permanently delete this story?')) return;
        await fetch(`/api/admin/moderation/${id}`, {
            method: 'PUT',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            body: JSON.stringify({ action }),
        });
        if (action === 'delete') {
            setStories((prev) => prev.filter((s) => s.id !== id));
        } else {
            fetchFlagged();
        }
    };

    return (
        <AdminLayout breadcrumbs={breadcrumbs}>
            <Head title="Moderation" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">Moderation Queue</h1>
                <p className="mb-6 text-sm text-muted-foreground">
                    {stories.length} flagged {stories.length === 1 ? 'story' : 'stories'}
                </p>

                {isLoading ? (
                    <div className="space-y-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-24 animate-pulse rounded-lg border bg-muted" />
                        ))}
                    </div>
                ) : stories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                        <p className="text-4xl mb-3">✅</p>
                        <h3 className="font-semibold text-lg mb-1">Queue is clear</h3>
                        <p className="text-muted-foreground">No flagged stories to review</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {stories.map((story: Story) => (
                            <div key={story.id} className="rounded-lg border border-red-200 bg-red-50/30 p-4">
                                <div className="mb-2 flex items-start justify-between">
                                    <div>
                                        <h3 className="font-semibold">{story.title}</h3>
                                        <p className="text-sm text-muted-foreground">by {story.user?.name}</p>
                                    </div>
                                    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Flagged</span>
                                </div>
                                {story.flagged_reason && (
                                    <p className="mb-3 text-sm text-red-700">
                                        <strong>Reason:</strong> {story.flagged_reason}
                                    </p>
                                )}
                                {story.description && (
                                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{story.description}</p>
                                )}
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => void moderate(story.id, 'unflag')}
                                        className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
                                    >
                                        Unflag
                                    </button>
                                    <button
                                        onClick={() => void moderate(story.id, 'delete')}
                                        className="rounded-md bg-red-600 px-3 py-1.5 text-sm text-white hover:bg-red-700"
                                    >
                                        Delete Story
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
