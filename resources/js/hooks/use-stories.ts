import { useEffect, useState } from 'react';
import type { Story } from '@/types';

export function useStories() {
    const [stories, setStories] = useState<Story[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const headers = { 'X-Requested-With': 'XMLHttpRequest' };

    const fetchStories = () => {
        setIsLoading(true);
        fetch('/api/stories', { headers })
            .then((r) => r.json())
            .then((data) => { setStories(Array.isArray(data) ? data : []); setIsLoading(false); })
            .catch(() => { setError('Failed to load stories'); setIsLoading(false); });
    };

    useEffect(() => { fetchStories(); }, []);

    const deleteStory = async (id: string): Promise<void> => {
        await fetch(`/api/stories/${id}`, { method: 'DELETE', headers });
        setStories((prev) => prev.filter((s) => s.id !== id));
    };

    return { stories, isLoading, error, refetch: fetchStories, deleteStory };
}
