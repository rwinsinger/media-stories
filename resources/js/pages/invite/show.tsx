import { Head, router, usePage } from '@inertiajs/react';
import { useState } from 'react';
import type { Auth } from '@/types';

interface Props {
    inviter_name: string | null;
    email: string | null;
    token: string;
    expired: boolean;
    auth?: Auth;
}

export default function InviteShow() {
    const { inviter_name, email, token, expired, auth } = usePage<Props>().props;
    const [accepting, setAccepting] = useState(false);
    const [accepted, setAccepted] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const isLoggedIn = !!auth?.user;
    const isInvalid = inviter_name === null;

    const handleAccept = async () => {
        setAccepting(true);
        setError(null);
        try {
            await fetch(`/api/invitations/${token}/accept`, {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Content-Type': 'application/json',
                    'X-XSRF-TOKEN': decodeURIComponent(
                        document.cookie
                            .split('; ')
                            .find((row) => row.startsWith('XSRF-TOKEN='))
                            ?.split('=')[1] ?? '',
                    ),
                },
            });
            setAccepted(true);
        } catch {
            setError('Something went wrong. Please try again.');
        } finally {
            setAccepting(false);
        }
    };

    return (
        <>
            <Head title="You're Invited" />
            <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-violet-950 via-slate-900 to-pink-950 p-4">
                <div className="w-full max-w-md rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 p-8 text-center text-white shadow-2xl">
                    <div className="mb-6">
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-3xl">
                            ✉
                        </div>
                        <h1 className="text-2xl font-bold">Media Stories</h1>
                    </div>

                    {isInvalid || expired ? (
                        <>
                            <h2 className="mb-3 text-xl font-semibold text-white/90">
                                {isInvalid ? 'Invalid Invitation' : 'Invitation Expired'}
                            </h2>
                            <p className="mb-6 text-white/60">
                                {isInvalid
                                    ? 'This invitation link is not valid.'
                                    : 'This invitation has expired or has already been accepted.'}
                            </p>
                            <a
                                href="/"
                                className="inline-block rounded-lg bg-white/20 px-6 py-3 font-semibold text-white hover:bg-white/30 transition-colors"
                            >
                                Go to Media Stories
                            </a>
                        </>
                    ) : accepted ? (
                        <>
                            <h2 className="mb-3 text-xl font-semibold text-white/90">You're now friends!</h2>
                            <p className="mb-6 text-white/60">
                                You and {inviter_name} are now connected on Media Stories.
                            </p>
                            <a
                                href="/friends"
                                className="inline-block rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
                            >
                                View Friends
                            </a>
                        </>
                    ) : (
                        <>
                            <h2 className="mb-3 text-xl font-semibold text-white/90">
                                {inviter_name} invited you to join Media Stories!
                            </h2>
                            <p className="mb-8 text-white/60">
                                Share your stories with friends and family in a beautiful, private space.
                            </p>

                            {error && (
                                <p className="mb-4 rounded-lg bg-red-500/20 px-4 py-2 text-sm text-red-300">{error}</p>
                            )}

                            {isLoggedIn ? (
                                <button
                                    onClick={() => void handleAccept()}
                                    disabled={accepting}
                                    className="w-full rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {accepting ? 'Accepting…' : 'Accept & Add Friend'}
                                </button>
                            ) : (
                                <div className="space-y-3">
                                    <a
                                        href={`/register?invitation=${token}${email ? `&email=${encodeURIComponent(email)}` : ''}`}
                                        className="block w-full rounded-lg bg-gradient-to-r from-violet-500 to-pink-500 px-6 py-3 font-semibold text-white hover:opacity-90 transition-opacity"
                                    >
                                        Create Account
                                    </a>
                                    <a
                                        href={`/login?invitation=${token}`}
                                        className="block w-full rounded-lg bg-white/20 px-6 py-3 font-semibold text-white hover:bg-white/30 transition-colors"
                                    >
                                        Sign In
                                    </a>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}
