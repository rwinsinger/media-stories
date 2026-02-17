import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Story } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Admin', href: '/admin/analytics' },
    { title: 'Stories', href: '/admin/stories' },
];

export default function AdminStories() {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchStories = () => {
        fetch('/api/admin/stories', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setStories(data.data ?? []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => { fetchStories(); }, []);

    const feature = async (id: string, isFeatured: boolean) => {
        await fetch(`/api/admin/stories/${id}`, {
            method: 'PUT',
            headers: { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_featured: !isFeatured }),
        });
        fetchStories();
    };

    const deleteStory = async (id: string) => {
        if (!confirm('Delete this story permanently?')) return;
        await fetch(`/api/admin/stories/${id}`, {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        setStories((prev) => prev.filter((s) => s.id !== id));
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Admin Stories" />
            <div className="p-6">
                <h1 className="mb-6 text-2xl font-bold">All Stories</h1>

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
                                    <th className="px-4 py-2 text-left">Title</th>
                                    <th className="px-4 py-2 text-left">Author</th>
                                    <th className="px-4 py-2 text-left">Frames</th>
                                    <th className="px-4 py-2 text-left">Views</th>
                                    <th className="px-4 py-2 text-left">Status</th>
                                    <th className="px-4 py-2 text-left">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stories.map((story: Story) => (
                                    <tr key={story.id} className="border-b last:border-0 hover:bg-muted/30">
                                        <td className="px-4 py-2 font-medium">{story.title}</td>
                                        <td className="px-4 py-2 text-muted-foreground">{story.user?.name}</td>
                                        <td className="px-4 py-2">{story.frame_count}</td>
                                        <td className="px-4 py-2">{story.view_count}</td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-1">
                                                {story.is_published && <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Published</span>}
                                                {story.is_featured && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">Featured</span>}
                                                {story.is_flagged && <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Flagged</span>}
                                            </div>
                                        </td>
                                        <td className="px-4 py-2">
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => void feature(story.id, story.is_featured)}
                                                    className="rounded border px-2 py-1 text-xs hover:bg-accent"
                                                >
                                                    {story.is_featured ? 'Unfeature' : 'Feature'}
                                                </button>
                                                <button
                                                    onClick={() => void deleteStory(story.id)}
                                                    className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {stories.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No stories found</td>
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
