import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { Auth, BreadcrumbItem, Story } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
];

export default function Dashboard() {
    const { auth } = usePage<{ auth: Auth }>().props;
    const user = auth.user;
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetch('/api/stories', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data) => { setStories(Array.isArray(data) ? data : []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    }, []);

    const deleteStory = async (id: string) => {
        if (!confirm('Delete this story?')) return;
        await fetch(`/api/stories/${id}`, { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        setStories((prev) => prev.filter((s) => s.id !== id));
    };

    const isPremium = user.subscription_tier === 'premium';
    const maxStories = isPremium ? null : 5;
    const atLimit = maxStories !== null && user.story_count >= maxStories;
    const totalViews = stories.reduce((sum, s) => sum + s.view_count, 0);
    const publishedCount = stories.filter((s) => s.is_published).length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="p-6">
                <div className="mb-6 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Welcome back, {user.name}</h1>
                        <p className="text-muted-foreground">Manage your stories and connect with friends</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {atLimit && (
                            <span className="rounded-full bg-yellow-100 px-3 py-1 text-sm text-yellow-700">
                                Story limit reached ({user.story_count}/{maxStories})
                            </span>
                        )}
                        <button
                            onClick={() => !atLimit && router.visit('/story/new')}
                            disabled={atLimit}
                            className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            + New Story
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                    {[
                        { label: 'Total Stories', value: user.story_count },
                        { label: 'Published', value: publishedCount },
                        { label: 'Total Views', value: totalViews },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-lg border p-4">
                            <p className="text-sm text-muted-foreground">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                {/* Stories grid */}
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-48 animate-pulse rounded-lg border bg-muted" />
                        ))}
                    </div>
                ) : stories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
                        <p className="text-4xl mb-3">📖</p>
                        <h3 className="font-semibold text-lg mb-1">No stories yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first story to get started</p>
                        <button onClick={() => router.visit('/story/new')} className="rounded-md bg-primary px-4 py-2 text-primary-foreground">
                            Create Story
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stories.map((story) => (
                            <div key={story.id} className="group rounded-lg border p-4 transition-shadow hover:shadow-md">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold line-clamp-1">{story.title}</h3>
                                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs ${story.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                        {story.is_published ? 'Published' : 'Draft'}
                                    </span>
                                </div>
                                {story.description && (
                                    <p className="mb-3 text-sm text-muted-foreground line-clamp-2">{story.description}</p>
                                )}
                                <div className="flex items-center gap-3 text-xs text-muted-foreground mb-3">
                                    <span>🎞 {story.frame_count} frames</span>
                                    <span>👁 {story.view_count} views</span>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => router.visit(`/story/${story.id}/edit`)} className="flex-1 rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                                        Edit
                                    </button>
                                    <button onClick={() => router.visit(`/story/${story.id}/view`)} className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent">
                                        {story.is_published ? 'View' : 'Preview'}
                                    </button>
                                    <button onClick={() => void deleteStory(story.id)} className="rounded-md border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50">
                                        Delete
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
