import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { useFriends } from '@/hooks/use-friends';
import type { BreadcrumbItem, Friendship, User } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Friends', href: '/friends' },
];

export default function FriendsIndex() {
    const { friends, acceptedFriends, pendingReceived, isLoading, sendRequest, respond, unfriend } = useFriends();
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<User[]>([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (q: string) => {
        setSearchQuery(q);
        if (q.length < 2) { setSearchResults([]); return; }
        setIsSearching(true);
        const res = await fetch(`/api/friends/search?q=${encodeURIComponent(q)}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        setSearchResults(await res.json());
        setIsSearching(false);
    };

    const pendingSentIds = friends.filter((f) => f.status === 'pending').map((f) => f.addressee_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Friends" />
            <div className="mx-auto max-w-3xl p-6 space-y-8">
                <h1 className="text-2xl font-bold">Friends</h1>

                {/* Search */}
                <div>
                    <label className="mb-1 block text-sm font-medium">Add Friend</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => void handleSearch(e.target.value)}
                            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="Search by name or email..."
                        />
                        {isSearching && <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">Searching...</span>}
                    </div>
                    {searchResults.length > 0 && (
                        <div className="mt-1 rounded-md border bg-background shadow-md">
                            {searchResults.map((user: User) => (
                                <div key={user.id} className="flex items-center justify-between px-4 py-2 hover:bg-accent">
                                    <div>
                                        <p className="font-medium">{user.name}</p>
                                        <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => { void sendRequest(user.id); setSearchResults([]); setSearchQuery(''); }}
                                        disabled={pendingSentIds.includes(user.id)}
                                        className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
                                    >
                                        {pendingSentIds.includes(user.id) ? 'Pending' : 'Add Friend'}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Pending requests */}
                {pendingReceived.length > 0 && (
                    <section>
                        <h2 className="mb-3 font-semibold">Friend Requests ({pendingReceived.length})</h2>
                        <div className="space-y-2">
                            {pendingReceived.map((f: Friendship) => (
                                <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                                    <div>
                                        <p className="font-medium">{f.requester?.name}</p>
                                        <p className="text-xs text-muted-foreground">{f.requester?.email}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => void respond(f.id, 'accepted')}
                                            className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground"
                                        >
                                            Accept
                                        </button>
                                        <button
                                            onClick={() => void respond(f.id, 'declined')}
                                            className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                                        >
                                            Decline
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* Friends list */}
                <section>
                    <h2 className="mb-3 font-semibold">My Friends ({acceptedFriends.length})</h2>
                    {isLoading ? (
                        <div className="space-y-2">
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted" />
                            ))}
                        </div>
                    ) : acceptedFriends.length === 0 ? (
                        <p className="rounded-lg border border-dashed py-8 text-center text-muted-foreground">
                            No friends yet. Search for people to add.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {acceptedFriends.map((f: Friendship) => {
                                const friend = f.requester?.id === undefined ? f.addressee : f.requester;
                                return (
                                    <div key={f.id} className="flex items-center justify-between rounded-lg border p-3">
                                        <div>
                                            <p className="font-medium">{friend?.name}</p>
                                            <p className="text-xs text-muted-foreground">{friend?.email}</p>
                                        </div>
                                        <div className="flex gap-2">
                                            <a
                                                href={`/friends/${friend?.id}/stories`}
                                                className="rounded-md border px-3 py-1 text-sm hover:bg-accent"
                                            >
                                                Stories
                                            </a>
                                            <button
                                                onClick={() => void unfriend(f.id)}
                                                className="rounded-md border border-red-200 px-3 py-1 text-sm text-red-600 hover:bg-red-50"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </section>
            </div>
        </AppLayout>
    );
}
