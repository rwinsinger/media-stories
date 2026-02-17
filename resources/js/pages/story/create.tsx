import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'New Story', href: '/story/new' },
];

export default function StoryCreate() {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);

        const res = await fetch('/api/stories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ title, description }),
        });

        if (res.ok) {
            const story = await res.json();
            router.visit(`/story/${story.id}/edit`);
        } else {
            const data = await res.json();
            setError(data.message ?? 'Failed to create story');
            setIsSubmitting(false);
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="New Story" />
            <div className="mx-auto max-w-2xl p-6">
                <h1 className="mb-6 text-2xl font-bold">Create New Story</h1>
                <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
                    {error && (
                        <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>
                    )}
                    <div>
                        <label className="mb-1 block text-sm font-medium">Title *</label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Give your story a title"
                            required
                        />
                    </div>
                    <div>
                        <label className="mb-1 block text-sm font-medium">Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="What's your story about?"
                        />
                    </div>
                    <div className="flex gap-3">
                        <button
                            type="submit"
                            disabled={isSubmitting || !title.trim()}
                            className="rounded-md bg-primary px-6 py-2 text-primary-foreground disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creating...' : 'Create Story'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.visit('/dashboard')}
                            className="rounded-md border px-6 py-2 hover:bg-accent"
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            </div>
        </AppLayout>
    );
}
