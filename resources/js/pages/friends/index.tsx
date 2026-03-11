import { Head } from '@inertiajs/react';
import { useState } from 'react';
import AppLayout from '@/layouts/app-layout';
import { useFriends } from '@/hooks/use-friends';
import type { BreadcrumbItem, Friendship, User } from '@/types';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Friends', href: '/friends' },
];

interface SearchResult {
    user: User | null;
    friendship?: Friendship;
}

function getCsrfToken(): string {
    return decodeURIComponent(
        document.cookie
            .split('; ')
            .find((row) => row.startsWith('XSRF-TOKEN='))
            ?.split('=')[1] ?? '',
    );
}

export default function FriendsIndex() {
    const { friends, acceptedFriends, pendingReceived, isLoading, sendRequest, respond, unfriend } = useFriends();
    const [searchEmail, setSearchEmail] = useState('');
    const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
    const [isSearching, setIsSearching] = useState(false);
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

    const handleSearch = async (email: string) => {
        setSearchEmail(email);
        setSearchResult(null);
        setInviteStatus('idle');
        if (!email.includes('@')) { return; }
        setIsSearching(true);
        try {
            const res = await fetch(`/api/friends/search?email=${encodeURIComponent(email)}`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            const data = await res.json() as SearchResult;
            setSearchResult(data);
        } finally {
            setIsSearching(false);
        }
    };

    const handleSendInvite = async () => {
        setInviteStatus('sending');
        try {
            const res = await fetch('/api/invitations', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': getCsrfToken(),
                },
                body: JSON.stringify({ email: searchEmail }),
            });
            if (res.ok || res.status === 201) {
                setInviteStatus('sent');
            } else {
                setInviteStatus('error');
            }
        } catch {
            setInviteStatus('error');
        }
    };

    const pendingSentIds = friends.filter((f) => f.status === 'pending').map((f) => f.addressee_id);

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Friends" />
            <div className="mx-auto max-w-4xl p-6 space-y-8">
                <h1 className="text-2xl font-bold">Friends</h1>

                {/* Search */}
                <div>
                    <label className="mb-1 block text-sm font-medium">Add Friend by Email</label>
                    <div className="relative">
                        <input
                            type="email"
                            value={searchEmail}
                            onChange={(e) => void handleSearch(e.target.value)}
                            className="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                            placeholder="friend@example.com"
                        />
                        {isSearching && <span className="absolute right-3 top-2.5 text-sm text-muted-foreground">Searching...</span>}
                    </div>

                    {searchResult !== null && (
                        <div className="mt-1 rounded-md border bg-background shadow-md">
                            {searchResult.user ? (
                                <div className="flex items-center justify-between px-4 py-2 hover:bg-accent">
                                    <div>
                                        <p className="font-medium">{searchResult.user.name}</p>
                                        <p className="text-xs text-muted-foreground">{searchResult.user.email}</p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            void sendRequest(searchResult.user!.id);
                                            setSearchResult(null);
                                            setSearchEmail('');
                                        }}
                                        disabled={pendingSentIds.includes(searchResult.user.id) || !!searchResult.friendship}
                                        className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
                                    >
                                        {searchResult.friendship ? 'Already friends' : pendingSentIds.includes(searchResult.user.id) ? 'Pending' : 'Add Friend'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col gap-2 px-4 py-3">
                                    <p className="text-sm text-muted-foreground">No account found.</p>
                                    {inviteStatus === 'sent' ? (
                                        <span className="text-sm text-green-600 font-medium">Invitation sent!</span>
                                    ) : inviteStatus === 'error' ? (
                                        <span className="text-sm text-red-600">Already invited or error</span>
                                    ) : (
                                        <button
                                            onClick={() => void handleSendInvite()}
                                            disabled={inviteStatus === 'sending'}
                                            className="self-start rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
                                        >
                                            {inviteStatus === 'sending' ? 'Sending…' : 'Send Invite'}
                                        </button>
                                    )}
                                </div>
                            )}
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
