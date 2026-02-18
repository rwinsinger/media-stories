import { Head, router, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ShareStoryModal } from '@/components/share-story-modal';
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
    const [sharingStory, setSharingStory] = useState<Story | null>(null);

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
                            className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-md shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            + New Story
                        </button>
                    </div>
                </div>

                {/* Stats */}
                <div className="mb-6 grid gap-4 md:grid-cols-3">
                    {[
                        { label: 'Total Stories', value: user.story_count, gradient: 'from-violet-500 to-violet-600' },
                        { label: 'Published', value: publishedCount, gradient: 'from-pink-500 to-rose-500' },
                        { label: 'Total Views', value: totalViews, gradient: 'from-indigo-500 to-violet-500' },
                    ].map((stat) => (
                        <div key={stat.label} className="rounded-xl border bg-card p-5 shadow-sm">
                            <div className={`mb-3 inline-flex rounded-lg bg-gradient-to-br ${stat.gradient} p-2.5`}>
                                <span className="text-white text-lg">🎞</span>
                            </div>
                            <p className="text-sm font-medium text-muted-foreground">{stat.label}</p>
                            <p className="text-3xl font-bold">{stat.value.toLocaleString()}</p>
                        </div>
                    ))}
                </div>

                {/* Stories grid */}
                {isLoading ? (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="h-48 animate-pulse rounded-xl border bg-muted" />
                        ))}
                    </div>
                ) : stories.length === 0 ? (
                    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-primary/30 bg-card py-16 text-center">
                        <p className="text-5xl mb-3">📖</p>
                        <h3 className="font-semibold text-lg mb-1">No stories yet</h3>
                        <p className="text-muted-foreground mb-4">Create your first story to get started</p>
                        <button onClick={() => router.visit('/story/new')} className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-2 text-sm font-medium text-white shadow-md shadow-violet-500/20 hover:opacity-90 transition-opacity">
                            Create Story
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {stories.map((story) => (
                            <div key={story.id} className="group rounded-xl border bg-card p-4 shadow-sm transition-all hover:shadow-md hover:border-primary/40">
                                <div className="flex items-start justify-between mb-2">
                                    <h3 className="font-semibold line-clamp-1">{story.title}</h3>
                                    <span className={`ml-2 shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${story.is_published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
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
                                <div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => router.visit(`/story/${story.id}/edit`)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                                        Edit
                                    </button>
                                    <button onClick={() => router.visit(`/story/${story.id}/view`)} className="rounded-lg border border-border px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors">
                                        {story.is_published ? 'View' : 'Preview'}
                                    </button>
                                    <button onClick={() => setSharingStory(story)} className="rounded-lg border border-primary/40 px-3 py-1.5 text-sm text-primary hover:bg-primary/5 transition-colors">
                                        Share
                                    </button>
                                    <button onClick={() => void deleteStory(story.id)} className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 transition-colors">
                                        Delete
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {sharingStory && (
                <ShareStoryModal
                    storyId={sharingStory.id}
                    storyTitle={sharingStory.title}
                    onClose={() => setSharingStory(null)}
                />
            )}
        </AppLayout>
    );
}
