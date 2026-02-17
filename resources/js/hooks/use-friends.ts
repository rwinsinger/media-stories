import { useEffect, useState } from 'react';
import type { Friendship } from '@/types';

export function useFriends() {
    const [friends, setFriends] = useState<Friendship[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const headers = { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' };

    const fetchFriends = () => {
        fetch('/api/friends', { headers })
            .then((r) => r.json())
            .then((data) => { setFriends(data); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => { fetchFriends(); }, []);

    const sendRequest = async (addresseeId: number): Promise<void> => {
        await fetch('/api/friends', {
            method: 'POST',
            headers,
            body: JSON.stringify({ addressee_id: addresseeId }),
        });
        fetchFriends();
    };

    const respond = async (id: string, status: 'accepted' | 'declined'): Promise<void> => {
        await fetch(`/api/friends/${id}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ status }),
        });
        fetchFriends();
    };

    const unfriend = async (id: string): Promise<void> => {
        await fetch(`/api/friends/${id}`, { method: 'DELETE', headers });
        setFriends((prev) => prev.filter((f) => f.id !== id));
    };

    const acceptedFriends = friends.filter((f) => f.status === 'accepted');
    const pendingReceived = friends.filter((f) => f.status === 'pending');

    return { friends, acceptedFriends, pendingReceived, isLoading, sendRequest, respond, unfriend, refetch: fetchFriends };
}
