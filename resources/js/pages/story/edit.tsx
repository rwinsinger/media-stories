import { DndContext, DragEndEvent, KeyboardSensor, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Head, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { ShareStoryModal } from '@/components/share-story-modal';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, Frame, Story } from '@/types';

interface Props {
    storyId: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Edit Story', href: '#' },
];

/** Reads duration from a local file via a hidden media element. Returns ms, or null if unavailable. */
function getMediaDurationMs(objectUrl: string, tag: 'video' | 'audio'): Promise<number | null> {
    return new Promise((resolve) => {
        const el = document.createElement(tag);
        el.preload = 'metadata';
        el.onloadedmetadata = () => resolve(isFinite(el.duration) && el.duration > 0 ? Math.round(el.duration * 1000) : null);
        el.onerror = () => resolve(null);
        el.src = objectUrl;
    });
}

function formatDuration(ms: number): string {
    const s = Math.round(ms / 1000);
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rem = s % 60;
    return `${m}:${rem.toString().padStart(2, '0')}`;
}

function SortableFrame({ frame, index, onEdit, onDelete }: { frame: Frame; index: number; onEdit: (frame: Frame) => void; onDelete: (id: string) => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: frame.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 rounded-lg border bg-background p-3 transition-colors hover:border-primary/40"
        >
            {/* Drag handle */}
            <button
                {...attributes}
                {...listeners}
                className="shrink-0 cursor-grab touch-none text-muted-foreground hover:text-foreground active:cursor-grabbing"
                aria-label="Drag to reorder"
            >
                ⠿
            </button>

            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-violet-500 to-pink-500 text-sm font-semibold text-white">
                {index + 1}
            </span>

            {frame.media_type === 'image' ? (
                <img src={frame.media_url} alt="" className="h-12 w-16 rounded-md object-cover" />
            ) : (
                <div className="flex h-12 w-16 items-center justify-center rounded-md bg-muted text-xs">▶ Video</div>
            )}

            <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{frame.text_content || `Frame ${index + 1}`}</p>
                <p className="text-xs text-muted-foreground">{frame.duration / 1000}s · {frame.media_type}</p>
            </div>

            <div className="flex gap-1">
                <button
                    onClick={() => onEdit(frame)}
                    className="rounded-lg border px-2 py-1 text-xs hover:bg-accent transition-colors"
                >
                    Edit
                </button>
                <button
                    onClick={() => onDelete(frame.id)}
                    className="rounded-lg border border-red-200 px-2 py-1 text-xs text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 transition-colors"
                >
                    Delete
                </button>
            </div>
        </div>
    );
}

export default function StoryEdit({ storyId }: Props) {
    const [story, setStory] = useState<Story | null>(null);
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isPublished, setIsPublished] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [frames, setFrames] = useState<Frame[]>([]);
    const [showFrameModal, setShowFrameModal] = useState(false);
    const [editingFrame, setEditingFrame] = useState<Frame | null>(null);
    const [showShareModal, setShowShareModal] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
    );

    useEffect(() => {
        fetch(`/api/stories/${storyId}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data: Story) => {
                setStory(data);
                setTitle(data.title);
                setDescription(data.description ?? '');
                setIsPublished(data.is_published);
                setFrames(Array.isArray(data.frames) ? data.frames : []);
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
            const updated = await r.json() as Story;
            setStory((prev) => prev ? { ...prev, ...updated, frames: prev.frames } : prev);
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
        setFrames((prev) => prev.filter((f) => f.id !== frameId));
        setStory((prev) => prev ? { ...prev, frame_count: prev.frame_count - 1 } : prev);
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = frames.findIndex((f) => f.id === active.id);
        const newIndex = frames.findIndex((f) => f.id === over.id);
        const reordered = arrayMove(frames, oldIndex, newIndex);
        setFrames(reordered);

        // Persist new order_index for each moved frame
        await Promise.all(
            reordered.map((frame, idx) =>
                fetch(`/api/frames/${frame.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                    body: JSON.stringify({ order_index: idx }),
                }),
            ),
        );
    };

    if (!story) {
        return (
            <AppLayout breadcrumbs={breadcrumbs}>
                <div className="p-6 animate-pulse">Loading story...</div>
            </AppLayout>
        );
    }

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Edit: ${story.title}`} />
            <div className="p-6">
                <div className="grid gap-6 lg:grid-cols-3">
                    {/* Main content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Story details form */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h2 className="mb-4 font-semibold">Story Details</h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="mb-1 block text-sm font-medium">Title</label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        maxLength={100}
                                        className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
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
                                        className="w-full rounded-lg border bg-background px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                                    />
                                    <p className="mt-1 text-xs text-muted-foreground">{description.length}/500</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="published"
                                        checked={isPublished}
                                        onChange={(e) => setIsPublished(e.target.checked)}
                                        className="accent-primary"
                                    />
                                    <label htmlFor="published" className="text-sm font-medium">Published</label>
                                </div>
                                <button
                                    onClick={() => void saveStory()}
                                    disabled={isSaving}
                                    className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isSaving ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>

                        {/* Frames list with drag-and-drop */}
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <div className="mb-4 flex items-center justify-between">
                                <h2 className="font-semibold">Frames ({frames.length}/100)</h2>
                                <button
                                    onClick={() => setShowFrameModal(true)}
                                    disabled={frames.length >= 100}
                                    className="rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    + Add Frame
                                </button>
                            </div>
                            {frames.length === 0 ? (
                                <div className="rounded-lg border border-dashed border-primary/30 py-8 text-center">
                                    <p className="text-muted-foreground">No frames yet. Add your first frame to build your story.</p>
                                </div>
                            ) : (
                                <>
                                    <p className="mb-2 text-xs text-muted-foreground">Drag frames to reorder</p>
                                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => void handleDragEnd(e)}>
                                        <SortableContext items={frames.map((f) => f.id)} strategy={verticalListSortingStrategy}>
                                            <div className="space-y-2">
                                                {frames.map((frame, i) => (
                                                    <SortableFrame
                                                        key={frame.id}
                                                        frame={frame}
                                                        index={i}
                                                        onEdit={setEditingFrame}
                                                        onDelete={(id) => void deleteFrame(id)}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-4">
                        <div className="rounded-xl border bg-card p-5 shadow-sm">
                            <h2 className="mb-3 font-semibold">Story Info</h2>
                            <dl className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Frames</dt>
                                    <dd className="font-medium">{story.frame_count}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Views</dt>
                                    <dd className="font-medium">{story.view_count}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-muted-foreground">Created</dt>
                                    <dd className="font-medium">{new Date(story.created_at).toLocaleDateString()}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-2">
                            <h2 className="mb-3 font-semibold">Actions</h2>
                            <button
                                onClick={() => router.visit(`/story/${story.id}/view`)}
                                className="w-full rounded-lg border border-primary/30 px-4 py-2 text-sm font-medium text-primary hover:bg-accent transition-colors"
                            >
                                {story.is_published ? 'View Story' : 'Preview Draft'}
                            </button>
                            <button
                                onClick={() => setShowShareModal(true)}
                                className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity"
                            >
                                Share Story
                            </button>
                            <button
                                onClick={() => void deleteStory()}
                                className="w-full rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900/50 dark:hover:bg-red-900/20 transition-colors"
                            >
                                Delete Story
                            </button>
                        </div>
                    </div>
                </div>

                {/* Share Modal */}
                {showShareModal && (
                    <ShareStoryModal
                        storyId={storyId}
                        storyTitle={story.title}
                        onClose={() => setShowShareModal(false)}
                    />
                )}

                {/* Edit Frame Modal */}
                {editingFrame && (
                    <EditFrameModal
                        frame={editingFrame}
                        onClose={() => setEditingFrame(null)}
                        onSaved={(updated) => {
                            setFrames((prev) => prev.map((f) => f.id === updated.id ? updated : f));
                            setEditingFrame(null);
                        }}
                    />
                )}

                {/* Add Frame Modal */}
                {showFrameModal && (
                    <AddFrameModal
                        storyId={storyId}
                        orderIndex={frames.length}
                        onClose={() => setShowFrameModal(false)}
                        onAdded={(frame) => {
                            setFrames((prev) => [...prev, frame]);
                            setStory((prev) => prev ? { ...prev, frame_count: prev.frame_count + 1 } : prev);
                            setShowFrameModal(false);
                        }}
                    />
                )}
            </div>
        </AppLayout>
    );
}

function EditFrameModal({ frame, onClose, onSaved }: { frame: Frame; onClose: () => void; onSaved: (frame: Frame) => void }) {
    const [mediaUrl, setMediaUrl] = useState(frame.media_url);
    const [mediaType, setMediaType] = useState<'image' | 'video'>(frame.media_type);
    const [previewUrl, setPreviewUrl] = useState(frame.media_url);
    const [textContent, setTextContent] = useState(frame.text_content ?? '');
    const [duration, setDuration] = useState(frame.duration);
    const [sliderMax, setSliderMax] = useState(Math.max(30000, frame.duration));
    const [audioUrl, setAudioUrl] = useState(frame.audio_url ?? '');
    const [inputMode, setInputMode] = useState<'file' | 'url'>('file');
    const [isUploading, setIsUploading] = useState(false);
    const [isAudioUploading, setIsAudioUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const isVideo = file.type.startsWith('video/');
        setMediaType(isVideo ? 'video' : 'image');
        const objectUrl = URL.createObjectURL(file);
        setPreviewUrl(objectUrl);
        setUploadError(null);

        if (isVideo) {
            const detected = await getMediaDurationMs(objectUrl, 'video');
            if (detected) {
                setDuration(detected);
                setSliderMax((prev) => Math.max(prev, detected));
            }
        }

        const formData = new FormData();
        formData.append('file', file);
        try {
            const r = await fetch('/api/upload', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: formData });
            const data = await r.json() as { url?: string; message?: string };
            if (r.ok && data.url) {
                setMediaUrl(data.url);
            } else {
                setUploadError(data.message ?? 'Upload failed');
                setPreviewUrl(mediaUrl);
            }
        } catch {
            setUploadError('Upload failed. Please try again.');
            setPreviewUrl(mediaUrl);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        const detected = await getMediaDurationMs(objectUrl, 'audio');
        if (detected) {
            setDuration(detected);
            setSliderMax((prev) => Math.max(prev, detected));
        }
        setIsAudioUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        try {
            const r = await fetch('/api/upload', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: formData });
            const data = await r.json() as { url?: string };
            if (r.ok && data.url) { setAudioUrl(data.url); }
        } finally {
            setIsAudioUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const r = await fetch(`/api/frames/${frame.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({
                    media_url: mediaUrl,
                    media_type: mediaType,
                    text_content: textContent || null,
                    duration,
                    audio_url: audioUrl || null,
                }),
            });
            if (r.ok) { onSaved(await r.json()); }
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl shadow-violet-500/10 max-h-[90vh] overflow-y-auto">
                <h2 className="mb-4 text-lg font-semibold">Edit Frame</h2>

                {/* Live preview */}
                <div className="mb-4 overflow-hidden rounded-lg bg-black aspect-video">
                    {mediaType === 'image' ? (
                        <img src={previewUrl} alt="" className="h-full w-full object-contain" />
                    ) : (
                        <video src={previewUrl} className="h-full w-full" controls />
                    )}
                </div>

                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                    {/* Replace media */}
                    <div>
                        <label className="mb-2 block text-sm font-medium">Replace Media (optional)</label>
                        <div className="flex rounded-md border overflow-hidden mb-2">
                            <button
                                type="button"
                                onClick={() => setInputMode('file')}
                                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${inputMode === 'file' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                            >
                                Upload File
                            </button>
                            <button
                                type="button"
                                onClick={() => setInputMode('url')}
                                className={`flex-1 py-1.5 text-sm font-medium transition-colors ${inputMode === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                            >
                                Use URL
                            </button>
                        </div>

                        {inputMode === 'file' ? (
                            <div>
                                <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                    onChange={(e) => void handleFileChange(e)}
                                    className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                                />
                                {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
                                {isUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>}
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <input
                                    type="url"
                                    value={mediaUrl}
                                    onChange={(e) => { setMediaUrl(e.target.value); setPreviewUrl(e.target.value); }}
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                    placeholder="https://..."
                                />
                                <select
                                    value={mediaType}
                                    onChange={(e) => setMediaType(e.target.value as 'image' | 'video')}
                                    className="w-full rounded-md border px-3 py-2 text-sm"
                                >
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                </select>
                            </div>
                        )}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Caption / Text</label>
                        <textarea
                            value={textContent}
                            onChange={(e) => setTextContent(e.target.value)}
                            maxLength={500}
                            rows={3}
                            placeholder="Add a caption or description shown below the image..."
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                        />
                        <p className="mt-1 text-xs text-muted-foreground">{textContent.length}/500</p>
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Duration: {formatDuration(duration)}</label>
                        <input type="range" min="1000" max={sliderMax} step="1000" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Background Audio (optional)</label>
                        <input
                            type="file"
                            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                            onChange={(e) => void handleAudioChange(e)}
                            className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                        />
                        {isAudioUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading audio...</p>}
                        {audioUrl && <p className="mt-1 text-xs text-emerald-600">Audio attached ✓</p>}
                    </div>

                    <div className="flex gap-2">
                        <button type="submit" disabled={isSaving || isUploading} className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50">
                            {isSaving ? 'Saving...' : isUploading ? 'Uploading...' : 'Save Changes'}
                        </button>
                        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddFrameModal({ storyId, orderIndex, onClose, onAdded }: { storyId: string; orderIndex: number; onClose: () => void; onAdded: (frame: Frame) => void }) {
    const [inputMode, setInputMode] = useState<'file' | 'url'>('file');
    const [mediaUrl, setMediaUrl] = useState('');
    const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
    const [textContent, setTextContent] = useState('');
    const [duration, setDuration] = useState(5000);
    const [sliderMax, setSliderMax] = useState(30000);
    const [audioUrl, setAudioUrl] = useState('');
    const [isUploading, setIsUploading] = useState(false);
    const [isAudioUploading, setIsAudioUploading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const [uploadError, setUploadError] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isVideo = file.type.startsWith('video/');
        setMediaType(isVideo ? 'video' : 'image');
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);
        setUploadError(null);

        if (isVideo) {
            const detected = await getMediaDurationMs(objectUrl, 'video');
            if (detected) {
                setDuration(detected);
                setSliderMax((prev) => Math.max(prev, detected));
            }
        }

        setIsUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const r = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData,
            });
            const data = await r.json() as { url?: string; message?: string };
            if (r.ok && data.url) {
                setMediaUrl(data.url);
            } else {
                setUploadError(data.message ?? 'Upload failed');
                setPreview(null);
            }
        } catch {
            setUploadError('Upload failed. Please try again.');
            setPreview(null);
        } finally {
            setIsUploading(false);
        }
    };

    const handleAudioChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const objectUrl = URL.createObjectURL(file);
        const detected = await getMediaDurationMs(objectUrl, 'audio');
        if (detected) {
            setDuration(detected);
            setSliderMax((prev) => Math.max(prev, detected));
        }
        setIsAudioUploading(true);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const r = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
                body: formData,
            });
            const data = await r.json() as { url?: string };
            if (r.ok && data.url) {
                setAudioUrl(data.url);
            }
        } finally {
            setIsAudioUploading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const r = await fetch(`/api/stories/${storyId}/frames`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({
                    media_type: mediaType,
                    media_url: mediaUrl,
                    text_content: textContent || undefined,
                    duration,
                    order_index: orderIndex,
                    audio_url: audioUrl || undefined,
                }),
            });
            if (r.ok) {
                onAdded(await r.json());
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const canSubmit = mediaUrl && !isUploading && !isSubmitting;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-2xl shadow-violet-500/10 max-h-[90vh] overflow-y-auto">
                <h2 className="mb-4 text-lg font-semibold">Add Frame</h2>
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">

                    {/* Input mode toggle */}
                    <div className="flex rounded-md border overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setInputMode('file')}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${inputMode === 'file' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                        >
                            Upload File
                        </button>
                        <button
                            type="button"
                            onClick={() => setInputMode('url')}
                            className={`flex-1 py-2 text-sm font-medium transition-colors ${inputMode === 'url' ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}
                        >
                            Use URL
                        </button>
                    </div>

                    {inputMode === 'file' ? (
                        <div>
                            <label className="mb-1 block text-sm font-medium">Choose Image or Video</label>
                            <input
                                type="file"
                                accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/webm"
                                onChange={(e) => void handleFileChange(e)}
                                className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                            />
                            {uploadError && <p className="mt-1 text-xs text-red-600">{uploadError}</p>}
                            {isUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading...</p>}
                        </div>
                    ) : (
                        <div>
                            <label className="mb-1 block text-sm font-medium">Media URL</label>
                            <input
                                type="url"
                                value={mediaUrl}
                                onChange={(e) => { setMediaUrl(e.target.value); setPreview(e.target.value || null); }}
                                className="w-full rounded-md border px-3 py-2 text-sm"
                                placeholder="https://..."
                            />
                            <div className="mt-1">
                                <label className="mb-1 block text-sm font-medium">Media Type</label>
                                <select value={mediaType} onChange={(e) => setMediaType(e.target.value as 'image' | 'video')} className="w-full rounded-md border px-3 py-2 text-sm">
                                    <option value="image">Image</option>
                                    <option value="video">Video</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {/* Preview */}
                    {preview && (
                        <div className="rounded-md overflow-hidden bg-muted">
                            {mediaType === 'image' ? (
                                <img src={preview} alt="Preview" className="max-h-40 w-full object-contain" />
                            ) : (
                                <video src={preview} className="max-h-40 w-full" controls />
                            )}
                        </div>
                    )}

                    <div>
                        <label className="mb-1 block text-sm font-medium">Text Overlay (optional)</label>
                        <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} maxLength={500} rows={2} className="w-full rounded-md border px-3 py-2 text-sm" />
                    </div>

                    {/* Audio upload */}
                    <div>
                        <label className="mb-1 block text-sm font-medium">Background Audio (optional)</label>
                        <input
                            type="file"
                            accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg"
                            onChange={(e) => void handleAudioChange(e)}
                            className="w-full rounded-md border px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-primary file:px-3 file:py-1 file:text-xs file:text-primary-foreground"
                        />
                        {isAudioUploading && <p className="mt-1 text-xs text-muted-foreground">Uploading audio...</p>}
                        {audioUrl && <p className="mt-1 text-xs text-emerald-600">Audio uploaded ✓</p>}
                    </div>

                    <div>
                        <label className="mb-1 block text-sm font-medium">Duration: {formatDuration(duration)}</label>
                        <input type="range" min="1000" max={sliderMax} step="1000" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="w-full" />
                    </div>
                    <div className="flex gap-2">
                        <button type="submit" disabled={!canSubmit} className="flex-1 rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50">
                            {isSubmitting ? 'Adding...' : isUploading ? 'Uploading...' : 'Add Frame'}
                        </button>
                        <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm hover:bg-accent transition-colors">Cancel</button>
                    </div>
                </form>
            </div>
        </div>
    );
}
