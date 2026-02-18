import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import type { Auth, Friendship, StoryShare, User } from '@/types';

interface Props {
    storyId: string;
    storyTitle: string;
    onClose: () => void;
}

export function ShareStoryModal({ storyId, storyTitle, onClose }: Props) {
    const { auth } = usePage<{ auth: Auth }>().props;
    const currentUserId = auth.user.id;

    const [tab, setTab] = useState<'friends' | 'link'>('friends');
    const [friends, setFriends] = useState<User[]>([]);
    const [shares, setShares] = useState<StoryShare[]>([]);
    const [selected, setSelected] = useState<number[]>([]);
    const [message, setMessage] = useState('');
    const [isSharing, setIsSharing] = useState(false);
    const [shareLink, setShareLink] = useState<string | null>(null);
    const [expiresInDays, setExpiresInDays] = useState(3);
    const [isGeneratingLink, setIsGeneratingLink] = useState(false);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const jsonHeaders = { 'X-Requested-With': 'XMLHttpRequest', 'Content-Type': 'application/json' };

    useEffect(() => {
        Promise.all([
            fetch('/api/friends', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then((r) => r.json()),
            fetch('/api/story-shares', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }).then((r) => r.json()),
        ])
            .then(([friendships, allShares]) => {
                const friendUsers = (Array.isArray(friendships) ? friendships : []).map((f: Friendship) =>
                    f.requester_id === currentUserId ? f.addressee : f.requester,
                ).filter((u): u is User => !!u);
                setFriends(friendUsers);

                const storyShares = (Array.isArray(allShares) ? allShares : []).filter(
                    (s: StoryShare) => s.story_id === storyId && !s.is_revoked && s.shared_by_user_id === currentUserId,
                );
                setShares(storyShares);
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, [storyId, currentUserId]);

    const isAlreadyShared = (userId: number) => shares.some((s) => s.shared_with_user_id === userId);

    const handleShare = async () => {
        setIsSharing(true);
        setError(null);
        const toShare = selected.filter((id) => !isAlreadyShared(id));
        try {
            const results = await Promise.all(
                toShare.map((userId) =>
                    fetch('/api/story-shares', {
                        method: 'POST',
                        headers: jsonHeaders,
                        body: JSON.stringify({
                            story_id: storyId,
                            shared_with_user_id: userId,
                            permission_level: 'view',
                            message: message || undefined,
                        }),
                    }).then((r) => r.json()),
                ),
            );
            const newShares = results.filter((r) => !r.message) as StoryShare[];
            setShares((prev) => [...prev, ...newShares]);
            setSelected([]);
            setMessage('');
        } catch {
            setError('Failed to share. Please try again.');
        } finally {
            setIsSharing(false);
        }
    };

    const handleRevoke = async (shareId: string) => {
        await fetch(`/api/story-shares/${shareId}`, {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        setShares((prev) => prev.filter((s) => s.id !== shareId));
    };

    const handleGenerateLink = async () => {
        setIsGeneratingLink(true);
        try {
            const r = await fetch('/api/share-links', {
                method: 'POST',
                headers: jsonHeaders,
                body: JSON.stringify({ story_id: storyId, expires_in_days: expiresInDays }),
            });
            const data = await r.json() as { url?: string };
            if (r.ok && data.url) {
                setShareLink(data.url);
            }
        } finally {
            setIsGeneratingLink(false);
        }
    };

    const handleCopy = async () => {
        if (!shareLink) return;
        await navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const toggleSelect = (userId: number) => {
        setSelected((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]));
    };

    const sharedFriends = friends.filter((f) => isAlreadyShared(f.id));
    const unsharedFriends = friends.filter((f) => !isAlreadyShared(f.id));

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border bg-card shadow-2xl shadow-violet-500/10">
                {/* Header */}
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div>
                        <h2 className="text-lg font-semibold">Share Story</h2>
                        <p className="line-clamp-1 text-sm text-muted-foreground">{storyTitle}</p>
                    </div>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-muted-foreground hover:bg-accent transition-colors">
                        ✕
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b">
                    {(['friends', 'link'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => setTab(t)}
                            className={`flex-1 py-3 text-sm font-medium transition-colors ${tab === t ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
                        >
                            {t === 'friends' ? '👥 Share with Friends' : '🔗 Public Link'}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {tab === 'friends' ? (
                        <div className="space-y-4">
                            {isLoading ? (
                                <div className="space-y-2">
                                    {[1, 2, 3].map((i) => (
                                        <div key={i} className="h-12 animate-pulse rounded-lg bg-muted" />
                                    ))}
                                </div>
                            ) : (
                                <>
                                    {/* Already shared */}
                                    {sharedFriends.length > 0 && (
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                Shared with
                                            </p>
                                            <div className="space-y-2">
                                                {sharedFriends.map((friend) => {
                                                    const share = shares.find((s) => s.shared_with_user_id === friend.id)!;
                                                    return (
                                                        <div key={friend.id} className="flex items-center justify-between rounded-lg border bg-background px-3 py-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-semibold text-white">
                                                                    {friend.name.charAt(0).toUpperCase()}
                                                                </div>
                                                                <span className="text-sm font-medium">{friend.name}</span>
                                                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
                                                                    Shared
                                                                </span>
                                                            </div>
                                                            <button
                                                                onClick={() => void handleRevoke(share.id)}
                                                                className="text-xs text-red-500 hover:text-red-700 transition-colors"
                                                            >
                                                                Revoke
                                                            </button>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Select friends */}
                                    {unsharedFriends.length > 0 ? (
                                        <div>
                                            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                                                {sharedFriends.length > 0 ? 'Share with more friends' : 'Select friends to share with'}
                                            </p>
                                            <div className="space-y-2">
                                                {unsharedFriends.map((friend) => (
                                                    <label
                                                        key={friend.id}
                                                        className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors ${selected.includes(friend.id) ? 'border-primary bg-primary/5' : 'bg-background hover:border-primary/40'}`}
                                                    >
                                                        <input
                                                            type="checkbox"
                                                            checked={selected.includes(friend.id)}
                                                            onChange={() => toggleSelect(friend.id)}
                                                            className="accent-primary"
                                                        />
                                                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-xs font-semibold text-white">
                                                            {friend.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <span className="text-sm font-medium">{friend.name}</span>
                                                    </label>
                                                ))}
                                            </div>

                                            {selected.length > 0 && (
                                                <div className="mt-3 space-y-3">
                                                    <div>
                                                        <label className="mb-1 block text-sm font-medium">Message (optional)</label>
                                                        <textarea
                                                            value={message}
                                                            onChange={(e) => setMessage(e.target.value)}
                                                            rows={2}
                                                            placeholder="Add a personal message..."
                                                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                                        />
                                                    </div>
                                                    {error && <p className="text-xs text-red-600">{error}</p>}
                                                    <button
                                                        onClick={() => void handleShare()}
                                                        disabled={isSharing}
                                                        className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 py-2 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                                                    >
                                                        {isSharing
                                                            ? 'Sharing...'
                                                            : `Share with ${selected.length} friend${selected.length > 1 ? 's' : ''}`}
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ) : friends.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-primary/30 py-8 text-center">
                                            <p className="text-sm text-muted-foreground">You don't have any friends yet.</p>
                                            <a href="/friends" className="mt-2 inline-block text-sm text-primary hover:underline">
                                                Find friends →
                                            </a>
                                        </div>
                                    ) : (
                                        <p className="py-4 text-center text-sm text-muted-foreground">
                                            Already shared with all your friends.
                                        </p>
                                    )}
                                </>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <p className="text-sm text-muted-foreground">
                                Generate a public link anyone can use to view this story.
                            </p>

                            <div>
                                <label className="mb-1 block text-sm font-medium">Link expires after</label>
                                <select
                                    value={expiresInDays}
                                    onChange={(e) => setExpiresInDays(Number(e.target.value))}
                                    className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                                >
                                    <option value={1}>1 day</option>
                                    <option value={3}>3 days</option>
                                    <option value={7}>7 days</option>
                                    <option value={30}>30 days</option>
                                </select>
                            </div>

                            {shareLink ? (
                                <div className="space-y-3">
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={shareLink}
                                            readOnly
                                            className="min-w-0 flex-1 rounded-lg border bg-muted px-3 py-2 font-mono text-sm"
                                        />
                                        <button
                                            onClick={() => void handleCopy()}
                                            className={`shrink-0 rounded-lg px-4 py-2 text-sm font-medium transition-colors ${copied ? 'bg-emerald-500 text-white' : 'bg-primary text-primary-foreground hover:opacity-90'}`}
                                        >
                                            {copied ? '✓ Copied!' : 'Copy'}
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => void handleGenerateLink()}
                                        disabled={isGeneratingLink}
                                        className="w-full rounded-lg border py-2 text-sm hover:bg-accent transition-colors disabled:opacity-50"
                                    >
                                        Generate new link
                                    </button>
                                </div>
                            ) : (
                                <button
                                    onClick={() => void handleGenerateLink()}
                                    disabled={isGeneratingLink}
                                    className="w-full rounded-lg bg-gradient-to-r from-violet-600 to-pink-600 py-3 text-sm font-medium text-white shadow-sm shadow-violet-500/20 hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {isGeneratingLink ? 'Generating...' : '🔗 Generate Share Link'}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
