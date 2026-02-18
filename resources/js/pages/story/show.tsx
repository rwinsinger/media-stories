import { Head, usePage } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ShareStoryModal } from '@/components/share-story-modal';
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
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [showShareModal, setShowShareModal] = useState(false);
    const viewerRef = useRef<HTMLDivElement>(null);
    const touchStartX = useRef<number | null>(null);

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

    // Auto-advance when playing
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

    const goNext = useCallback(() => {
        setCurrentIndex((i) => Math.min(frames.length - 1, i + 1));
    }, [frames.length]);

    const goPrev = useCallback(() => {
        setCurrentIndex((i) => Math.max(0, i - 1));
    }, []);

    const toggleFullscreen = useCallback(() => {
        if (!isFullscreen) {
            void (viewerRef.current ?? document.documentElement).requestFullscreen();
        } else {
            void document.exitFullscreen();
        }
    }, [isFullscreen]);

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
            if (e.key === 'ArrowRight') goNext();
            else if (e.key === 'ArrowLeft') goPrev();
            else if (e.key === ' ') { e.preventDefault(); setIsPlaying((p) => !p); }
            else if (e.key === 'f' || e.key === 'F') toggleFullscreen();
        };
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [goNext, goPrev, toggleFullscreen]);

    // Track fullscreen state changes (browser controls Esc)
    useEffect(() => {
        const onChange = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', onChange);
        return () => document.removeEventListener('fullscreenchange', onChange);
    }, []);

    // Touch swipe
    useEffect(() => {
        const el = viewerRef.current;
        if (!el) return;
        const onStart = (e: TouchEvent) => { touchStartX.current = e.touches[0].clientX; };
        const onEnd = (e: TouchEvent) => {
            if (touchStartX.current === null) return;
            const diff = touchStartX.current - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) goNext();
                else goPrev();
            }
            touchStartX.current = null;
        };
        el.addEventListener('touchstart', onStart, { passive: true });
        el.addEventListener('touchend', onEnd, { passive: true });
        return () => { el.removeEventListener('touchstart', onStart); el.removeEventListener('touchend', onEnd); };
    }, [goNext, goPrev]);

    const currentFrame = frames[currentIndex];
    const isOwner = story ? auth.user.id === story.user_id : false;
    const showDots = frames.length > 0 && frames.length <= 20;

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
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity"
                            >
                                Share
                            </button>
                            <a href={`/story/${story.id}/edit`} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors">
                                Edit
                            </a>
                        </div>
                    )}
                </div>

                {frames.length === 0 ? (
                    <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                        <p className="text-muted-foreground">No frames yet</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {/* Progress bar */}
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                                className="h-full rounded-full bg-gradient-to-r from-violet-500 to-pink-500 transition-all duration-300"
                                style={{ width: `${((currentIndex + 1) / frames.length) * 100}%` }}
                            />
                        </div>

                        {/* Viewer */}
                        <div
                            ref={viewerRef}
                            className="relative overflow-hidden rounded-lg border bg-black aspect-video select-none"
                        >
                            {currentFrame?.media_type === 'image' && (
                                <img src={currentFrame.media_url} alt={currentFrame.text_content ?? ''} className="h-full w-full object-contain" />
                            )}
                            {currentFrame?.media_type === 'video' && (
                                <video
                                    key={currentFrame.id}
                                    src={currentFrame.media_url}
                                    className="h-full w-full"
                                    autoPlay={isPlaying}
                                    muted={isMuted}
                                />
                            )}

                            {/* Frame index badge */}
                            <div className="absolute top-2 right-2 rounded-full bg-black/50 px-2 py-0.5 text-xs text-white">
                                {currentIndex + 1} / {frames.length}
                            </div>
                        </div>

                        {/* Caption */}
                        {currentFrame?.text_content && (
                            <div className="rounded-lg border bg-card px-4 py-3 text-sm leading-relaxed">
                                {currentFrame.text_content}
                            </div>
                        )}

                        {/* Controls */}
                        <div className="flex items-center justify-center gap-2">
                            <button
                                onClick={goPrev}
                                disabled={currentIndex === 0}
                                className="rounded-lg border px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                                title="Previous (←)"
                            >
                                ← Prev
                            </button>
                            <button
                                onClick={() => setIsPlaying((p) => !p)}
                                className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-8 py-2 font-medium text-white shadow-md shadow-violet-500/20 hover:opacity-90 transition-opacity"
                                title="Play/Pause (Space)"
                            >
                                {isPlaying ? 'Pause' : 'Play'}
                            </button>
                            <button
                                onClick={goNext}
                                disabled={currentIndex === frames.length - 1}
                                className="rounded-lg border px-4 py-2 hover:bg-accent transition-colors disabled:opacity-50"
                                title="Next (→)"
                            >
                                Next →
                            </button>

                            {/* Mute button — video only */}
                            {currentFrame?.media_type === 'video' && (
                                <button
                                    onClick={() => setIsMuted((m) => !m)}
                                    className="rounded-lg border px-3 py-2 hover:bg-accent transition-colors"
                                    title="Toggle mute"
                                >
                                    {isMuted ? '🔇' : '🔊'}
                                </button>
                            )}

                            {/* Fullscreen button */}
                            <button
                                onClick={toggleFullscreen}
                                className="rounded-lg border px-3 py-2 hover:bg-accent transition-colors"
                                title="Toggle fullscreen (F)"
                            >
                                {isFullscreen ? '⛶' : '⛶'}
                            </button>
                        </div>

                        {/* Progress dots */}
                        {showDots ? (
                            <div className="flex justify-center gap-1.5">
                                {frames.map((_, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`h-2 rounded-full transition-all ${idx === currentIndex ? 'w-6 bg-gradient-to-r from-violet-500 to-pink-500' : idx < currentIndex ? 'w-2 bg-violet-300 dark:bg-violet-700' : 'w-2 bg-muted-foreground/30'}`}
                                        aria-label={`Frame ${idx + 1}`}
                                    />
                                ))}
                            </div>
                        ) : (
                            <p className="text-center text-sm text-muted-foreground">
                                {currentIndex + 1} / {frames.length}
                            </p>
                        )}

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

                        <p className="text-center text-xs text-muted-foreground">
                            Tip: use ← → to navigate, Space to play/pause, F for fullscreen
                        </p>
                    </div>
                )}
            </div>

            {showShareModal && (
                <ShareStoryModal
                    storyId={story.id}
                    storyTitle={story.title}
                    onClose={() => setShowShareModal(false)}
                />
            )}
        </AppLayout>
    );
}
