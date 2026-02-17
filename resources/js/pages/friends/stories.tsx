import { Head } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import { router } from '@inertiajs/react';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, StoryShare, User } from '@/types';

interface Props {
    friendId: string;
}

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Friends', href: '/friends' },
    { title: "Friend's Stories", href: '#' },
];

export default function FriendStories({ friendId }: Props) {
    const [shares, setShares] = useState<StoryShare[]>([]);
    const [friend, setFriend] = useState<User | null>(null);

    useEffect(() => {
        fetch('/api/story-shares', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((r) => r.json())
            .then((data: StoryShare[]) => {
                const friendShares = data.filter(
                    (s) => s.shared_by_user_id === Number(friendId) && !s.is_revoked,
                );
                setShares(friendShares);
                if (friendShares.length > 0) {
                    setFriend(friendShares[0].sharedBy ?? null);
                }
            });
    }, [friendId]);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Friend's Stories" />
            <div className="mx-auto max-w-4xl p-6">
                {friend && (
                    <div className="mb-6 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                            {friend.name[0].toUpperCase()}
                        </div>
                        <div>
                            <h1 className="text-xl font-bold">{friend.name}'s Stories</h1>
                            <p className="text-sm text-muted-foreground">{shares.length} stories shared with you</p>
                        </div>
                    </div>
                )}

                {shares.length === 0 ? (
                    <p className="text-muted-foreground">No stories have been shared with you by this friend.</p>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {shares.map((share) => (
                            <div key={share.id} className="rounded-lg border p-4 hover:shadow-md transition-shadow">
                                <h3 className="font-semibold mb-1">{share.story?.title}</h3>
                                {share.story?.description && (
                                    <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{share.story.description}</p>
                                )}
                                <div className="flex items-center justify-between">
                                    <p className="text-xs text-muted-foreground">
                                        Shared {new Date(share.shared_at).toLocaleDateString()}
                                    </p>
                                    <button
                                        onClick={() => router.visit(`/story/${share.story_id}/view`)}
                                        className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground"
                                    >
                                        View
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
