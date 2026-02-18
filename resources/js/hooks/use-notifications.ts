import { useEffect, useState } from 'react';
import type { Notification } from '@/types';

export function useNotifications() {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const headers = { 'X-Requested-With': 'XMLHttpRequest' };

    const fetchNotifications = () => {
        fetch('/api/notifications', { headers })
            .then((r) => r.json())
            .then((data) => { setNotifications(Array.isArray(data) ? data : []); setIsLoading(false); })
            .catch(() => setIsLoading(false));
    };

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000);
        return () => clearInterval(interval);
    }, []);

    const markAllRead = async (): Promise<void> => {
        await fetch('/api/notifications', { method: 'PATCH', headers });
        setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    };

    const dismiss = async (id: string): Promise<void> => {
        await fetch(`/api/notifications/${id}`, { method: 'DELETE', headers });
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    const unreadCount = notifications.filter((n) => !n.is_read).length;

    return { notifications, isLoading, unreadCount, markAllRead, dismiss, refetch: fetchNotifications };
}
