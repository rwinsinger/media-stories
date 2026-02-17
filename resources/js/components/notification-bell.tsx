import { useNotifications } from '@/hooks/use-notifications';
import type { Notification } from '@/types';

export default function NotificationBell() {
    const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();

    return (
        <div className="relative">
            <details className="group">
                <summary className="relative cursor-pointer list-none rounded-md p-2 hover:bg-accent">
                    <span className="text-xl">🔔</span>
                    {unreadCount > 0 && (
                        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white">
                            {unreadCount > 9 ? '9+' : unreadCount}
                        </span>
                    )}
                </summary>
                <div className="absolute right-0 z-50 mt-1 w-80 rounded-lg border bg-background shadow-lg">
                    <div className="flex items-center justify-between border-b px-4 py-2">
                        <span className="font-medium">Notifications</span>
                        {unreadCount > 0 && (
                            <button onClick={() => void markAllRead()} className="text-xs text-primary hover:underline">
                                Mark all read
                            </button>
                        )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                        {notifications.length === 0 ? (
                            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications</p>
                        ) : (
                            notifications.map((n: Notification) => (
                                <div key={n.id} className={`flex items-start gap-3 border-b px-4 py-3 last:border-0 ${!n.is_read ? 'bg-accent/30' : ''}`}>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium">{n.title}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>
                                    </div>
                                    <button onClick={() => void dismiss(n.id)} className="shrink-0 text-muted-foreground hover:text-foreground">
                                        ✕
                                    </button>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </details>
        </div>
    );
}
