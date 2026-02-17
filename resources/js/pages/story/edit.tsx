import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Frame, Story } from '@/types';

interface Props {
    storyId: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Edit Story', href: '#' },
];

export default function StoryEdit({ storyId }: Props) {
    const [story, setStory] = useState<Story | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showFrameModal, setShowFrameModal] = useState(false);

    useEffect(() => {
        fetch(`/api/stories/${storyId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data: Story) => {
                setStory(data);
                setTitle(data.title);
                setDescription(data.description ?? '');
                setIsPublished(data.is_published);
            });
    }, [storyId]);

    const saveStory = async () => {
        setIsSaving(true);
        try {
            const r = await fetch(`/api/stories/${storyId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ title, description, is_published: isPublished }),
            });
            setStory(await r.json());
        } finally {
            setIsSaving(false);
        }
    };

    const deleteStory = async () => {
        if (!confirm('Delete this story and all its frames?')) return;
        await fetch(`/api/stories/${storyId}`, { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        router.visit('/dashboard');
    };

    const deleteFrame = async (frameId: string) => {
        await fetch(`/api/frames/${frameId}`, { method: 'DELETE', headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        setStory((prev) => prev ? { ...prev, frames: prev.frames?.filter((f) => f.id !== frameId) } : prev);
    };

    if (!story) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 animate-pulse">Loading story...</div>
            </AppLayout>
        );
    }

    const frames = story.frames ?? [];

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${story.title}`} />
            <div className="p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Story details form */}
                        <div className="rounded-lg border p-4">
                            <h2 className="mb-4 font-semibold">Story Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={100}
                                        className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">{title.length}/100</p>
                                </div>
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Description</label>
                                    <textarea
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        maxLength={500}
                                        rows={3}
                                        className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">{description.length}/500</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="published"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                    />
                                    <label htmlFor="published" className="text-sm font-medium">Published</label>
                                </div>
                                <button
                                    onClick={() => void saveStory()}
                                    disabled={isSaving}
                                    className="rounded-md bg-primary px-4 py-2 text-primary-foreground disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        {/* Frames list */}
                        <div className="rounded-lg border p-4">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-semibold">Frames ({frames.length}/100)</h2>
                                <button
                                    onClick={() => setShowFrameModal(true)}
                                    disabled={frames.length >= 100}
                                    className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
                                >
                                    + Add Frame
                                </button>
                            </div>
                            {frames.length === 0 ? (
                                <div className="rounded-lg border border-dashed py-8 text-center">
                                    <p className="text-muted-foreground">No frames yet. Add your first frame to build your story.</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {frames.map((frame, i) => (
                                        <div key={frame.id} className="flex items-center gap-3 rounded-lg border p-3">
                                            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-muted text-sm font-medium">{i + 1}</span>
                                            {frame.media_type === 'image' ? (
                                                <img src={frame.media_url} alt="" className="h-12 w-16 rounded object-cover" />
                                            ) : (
                                                <div className="flex h-12 w-16 items-center justify-center rounded bg-muted text-xs">Video</div>
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <p className="truncate text-sm">{frame.text_content || `Frame ${i + 1}`}</p>
                                                <p className="text-xs text-muted-foreground">{frame.duration / 1000}s · {frame.media_type}</p>
                                            </div>
                                            <button
                                                onClick={() => void deleteFrame(frame.id)}
                                                className="rounded border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="rounded-lg border p-4">
                            <h2 className="mb-3 font-semibold">Story Info</h2>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Frames</dt>
                                    <dd>{story.frame_count}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Views</dt>
                                    <dd>{story.view_count}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Created</dt>
                                    <dd>{new Date(story.created_at).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-lg border p-4 space-y-2">
                            <h2 className="mb-3 font-semibold">Actions</h2>
                            {story.is_published && (
                                <button
                                    onClick={() => router.visit(`/story/${story.id}/view`)}
                                    className="w-full rounded-md border px-4 py-2 text-sm hover:bg-accent"
                                >
                                    Preview Story
                                </button>
                            )}
                            <button
                                onClick={() => void deleteStory()}
                                className="w-full rounded-md border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                            >
                                Delete Story
                            </button>
                        </div>
                    </div>
                </div>

                {/* Add Frame Modal */}
                {showFrameModal && (
                    <AddFrameModal
                        storyId={storyId}
                        orderIndex={frames.length}
                        onClose={() => setShowFrameModal(false)}
                        onAdded={(frame) => {
                            setStory((prev) => prev ? { ...prev, frames: [...(prev.frames ?? []), frame], frame_count: prev.frame_count + 1 } : prev);
                            setShowFrameModal(false);
                        }}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function AddFrameModal({ storyId, orderIndex, onClose, onAdded }: { storyId: string; orderIndex: number; onClose: () => void; onAdded: (frame: Frame) => void }) {
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [textContent, setTextContent] = useState('');
    const [duration, setDuration] = useState(5000);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const r = await fetch(`/api/stories/${storyId}/frames`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ media_type: mediaType, media_url: mediaUrl, text_content: textContent, duration, order_index: orderIndex }),
            });
            if (r.ok) {
                onAdded(await r.json());
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-xl">
                <h2 className="mb-4 text-lg font-semibold">Add Frame</h2>
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                    <div>
                        <label className="mb-1 block text-sm font-medium">Media Type</label>
                        <select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'video')} className="w-full rounded-md border px-3 py-2">
                            <option value="image">Image</option>
                            <option value="video">Video</option>
                        </select>
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Media URL</label>
                        <input type="text" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} required className="w-full rounded-md border px-3 py-2" placeholder="https://..." />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Text Overlay (optional)</label>
                        <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} maxLength={500} rows={2} className="w-full rounded-md border px-3 py-2" />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Duration: {duration / 1000}s</label>
                        <input type="range" min="1000" max="30000" step="500" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={isSubmitting || !mediaUrl} className="flex-1 rounded-md bg-primary py-2 text-primary-foreground disabled:opacity-50">
                            {isSubmitting ? 'Adding...' : 'Add Frame'}
                        </button>
                        <button type="button" onClick={onClose} className="rounded-md border px-4 py-2 hover:bg-accent">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
