import { Head, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Frame, Story } from '@/types';

interface Props {
    story: Story & { frames: Frame[] };
    token: string;
    [key: string]: unknown;
}

export default function ShareShow() {
    const { story } = usePage<Props>().props;
    const frames = story.frames ?? [];
    const [currentIndex, setCurrentIndex] = useState(0);

    const currentFrame = frames[currentIndex];

    return (
        <>
            <Head title={story.title} />
            <div className="min-h-screen bg-background">
                {/* Header */}
                <header className="border-b px-6 py-4">
                    <div className="mx-auto flex max-w-4xl items-center justify-between">
                        <div>
                            <h1 className="font-bold">{story.title}</h1>
                            {story.description && <p className="text-sm text-muted-foreground">{story.description}</p>}
                        </div>
                        <a href="/" className="text-sm text-primary hover:underline">Media Stories</a>
                    </div>
                </header>

                <main className="mx-auto max-w-4xl p-6">
                    {frames.length === 0 ? (
                        <div className="flex h-64 items-center justify-center rounded-lg border border-dashed">
                            <p className="text-muted-foreground">This story has no frames yet</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Frame viewer */}
                            <div className="relative overflow-hidden rounded-lg border bg-black aspect-video">
                                {currentFrame?.media_type === 'image' && (
                                    <img src={currentFrame.media_url} alt={currentFrame.text_content ?? ''} className="h-full w-full object-contain" />
                                )}
                                {currentFrame?.media_type === 'video' && (
                                    <video src={currentFrame.media_url} className="h-full w-full" controls />
                                )}
                                {currentFrame?.text_content && (
                                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-white">
                                        {currentFrame.text_content}
                                    </div>
                                )}
                            </div>

                            {/* Navigation */}
                            <div className="flex items-center justify-center gap-4">
                                <button
                                    onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                                    disabled={currentIndex === 0}
                                    className="rounded-md border px-4 py-2 disabled:opacity-50"
                                >
                                    ← Prev
                                </button>
                                <span className="text-sm text-muted-foreground">
                                    {currentIndex + 1} / {frames.length}
                                </span>
                                <button
                                    onClick={() => setCurrentIndex((i) => Math.min(frames.length - 1, i + 1))}
                                    disabled={currentIndex === frames.length - 1}
                                    className="rounded-md border px-4 py-2 disabled:opacity-50"
                                >
                                    Next →
                                </button>
                            </div>

                            {/* Thumbnails */}
                            <div className="flex gap-2 overflow-x-auto pb-2">
                                {frames.map((frame: Frame, idx: number) => (
                                    <button
                                        key={frame.id}
                                        onClick={() => setCurrentIndex(idx)}
                                        className={`shrink-0 h-16 w-24 overflow-hidden rounded border-2 ${idx === currentIndex ? 'border-primary' : 'border-transparent'}`}
                                    >
                                        {frame.media_type === 'image' && (
                                            <img src={frame.media_url} alt="" className="h-full w-full object-cover" />
                                        )}
                                        {frame.media_type === 'video' && (
                                            <div className="flex h-full w-full items-center justify-center bg-gray-800 text-white text-xs">▶</div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </main>
            </div>
        </>
    );
}
