import { Head, usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { Auth, BreadcrumbItem, Frame, Story } from '@/types';

interface Props {
    storyId: string;
    [key: string]: unknown;
}

export default function StoryShow() {
    const { storyId, auth } = usePage<Props & { auth: Auth }>().props;
    const [story, setStory] = useState<Story | null>(null);
    const [frames, setFrames] = useState<Frame[]>([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    const breadcrumbs: BreadcrumbItem[] = [
        { title: 'Dashboard', href: '/dashboard' },
        { title: story?.title ?? 'Story', href: `/story/${storyId}/view` },
    ];

    useEffect(() => {
        fetch(`/api/stories/${storyId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data: Story) => {
                setStory(data);
                setFrames(Array.isArray(data.frames) ? data.frames : []);
            });
    }, [storyId]);

    useEffect(() => {
        if (!isPlaying || frames.length === 0) return;
        const frame = frames[currentIndex];
        const duration = frame?.duration ?? 5000;
        const timer = setTimeout(() => {
            if (currentIndex < frames.length - 1) {
                setCurrentIndex((i) => i + 1);
            } else {
                setIsPlaying(false);
            }
        }, duration);
        return () => clearTimeout(timer);
    }, [isPlaying, currentIndex, frames]);

    const currentFrame = frames[currentIndex];
    const isOwner = story ? auth.user.id === story.user_id : false;

    if (!story) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 animate-pulse">Loading story...</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={story.title} />
            <div className="mx-auto max-w-4xl p-6">
                <div className="mb-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">{story.title}</h1>
                        {!story.is_published && (
                            <span className="mt-1 inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">Draft</span>
                        )}
                        {story.description && <p className="mt-1 text-muted-foreground">{story.description}</p>}
                    </div>
                    {isOwner && (
                        <a href={`/story/${story.id}/edit`} className="rounded-md border px-4 py-2 hover:bg-accent">
                            Edit
                        </a>
                    )}
                </div>

                {frames.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                        <p className="text-muted-foreground">No frames yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Viewer */}
                        <div className="relative overflow-hidden rounded-lg border bg-black aspect-video">
                            {currentFrame?.media_type === 'image' && (
                                <img src={currentFrame.media_url} alt={currentFrame.text_content ?? ''} className="h-full w-full object-contain" />
                            )}
                            {currentFrame?.media_type === 'video' && (
                                <video src={currentFrame.media_url} className="h-full w-full" autoPlay={isPlaying} />
                            )}
                            {currentFrame?.text_content && (
                                <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white">
                                    {currentFrame.text_content}
                                </div>
                            )}
                        </div>

                                        {/* Controls */}
                        <div className="flex items-center justify-center gap-4">
                            <button
                                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                                disabled={currentIndex === 0}
                                className="rounded-lg border px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setIsPlaying((p) => !p)}
                                className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-8 py-2 font-medium text-white shadow-md shadow-violet-500/20 hover:opacity-90 transition-opacity"
                            >
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button
                                onClick={() => setCurrentIndex((i) => Math.min(frames.length - 1, i + 1))}
                                disabled={currentIndex === frames.length - 1}
                                className="rounded-lg border px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                            >
                                Next →
                            </button>
                        </div>

                        {/* Frame strip */}
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {frames.map((frame, idx) => (
                                <button
                                    key={frame.id}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`shrink-0 h-16 w-24 overflow-hidden rounded border-2 transition-all ${idx === currentIndex ? 'border-primary' : 'border-transparent'}`}
                                >
                                    {frame.media_type === 'image' && (
                                        <img src={frame.media_url} alt="" className="h-full w-full object-cover" />
                                    )}
                                    {frame.media_type === 'video' && (
                                        <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white text-xs">▶ Video</div>
                                    )}
                                </button>
                            ))}
                        </div>

                        <p className="text-center text-sm text-muted-foreground">
                            {currentIndex + 1} / {frames.length}
                        </p>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
