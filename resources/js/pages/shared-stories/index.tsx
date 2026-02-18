import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, StoryShare } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Shared With Me', href: '/shared-stories' },
];

export default function SharedStoriesIndex() {
    const [shares, setShares] = useState<StoryShare[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/story-shares', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setShares(Array.isArray(data) ? data : []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const sharedWithMe = shares.filter((s) => !s.is_revoked);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Shared With Me" />
            <div className="mx-auto max-w-4xl p-6">
                <h1 className="mb-6 text-2xl font-bold">Shared With Me</h1>
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-32 animate-pulse rounded-lg border bg-muted" />
                        ))}
                    </div>
                ) : sharedWithMe.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                        <p className="text-4xl mb-3">📤</p>
                        <h3 className="font-semibold text-lg mb-1">No stories shared with you yet</h3>
                        <p className="text-muted-foreground">When friends share stories with you, they'll appear here</p>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {sharedWithMe.map((share: StoryShare) => (
                            <div key={share.id} className="rounded-lg border p-4">
                                <div className="mb-2 flex items-start justify-between">
                                    <h3 className="font-semibold">{share.story?.title}</h3>
                                    <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                                        {share.permission_level}
                                    </span>
                                </div>
                                {share.story?.description && (
                                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{share.story.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Shared by {share.sharedBy?.name}
                                    </p>
                                    <button
                                        onClick={() => router.visit(`/story/${share.story_id}/view`)}
                                        className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
