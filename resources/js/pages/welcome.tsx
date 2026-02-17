import { Head, Link, usePage } from '@inertiajs/react';
import { dashboard, login, register } from '@/routes';

const FEATURES = [
    {
        emoji: '🎞',
        title: 'Build Visual Stories',
        description: 'Combine photos, videos, and audio into beautiful frame-by-frame narratives. Add captions, control timing, and craft the perfect sequence.',
        demo: (
            <div className="flex gap-2 p-4">
                {['🌅', '🏔', '🌊', '🌇'].map((e, i) => (
                    <div key={i} className={`flex h-16 flex-1 items-center justify-center rounded-lg text-2xl transition-all ${i === 1 ? 'scale-110 ring-2 ring-violet-400 bg-violet-900/40' : 'bg-white/10'}`}>
                        {e}
                    </div>
                ))}
            </div>
        ),
    },
    {
        emoji: '👥',
        title: 'Share With Friends',
        description: 'Connect with friends and share stories privately. Control who sees what with view-only permissions, and revoke access anytime.',
        demo: (
            <div className="p-4 space-y-2">
                {[
                    { name: 'Alex Chen', avatar: '👩', status: 'Can view' },
                    { name: 'Marcus Lee', avatar: '👨', status: 'Can view' },
                    { name: 'Priya Nair', avatar: '🧑', status: 'Pending...' },
                ].map((f) => (
                    <div key={f.name} className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
                        <span className="text-xl">{f.avatar}</span>
                        <span className="flex-1 text-sm font-medium text-white">{f.name}</span>
                        <span className="rounded-full bg-violet-500/30 px-2 py-0.5 text-xs text-violet-300">{f.status}</span>
                    </div>
                ))}
            </div>
        ),
    },
    {
        emoji: '🔗',
        title: 'Public Share Links',
        description: 'Generate a link to share any story publicly — no account required to view. Set an expiry and the link goes dark automatically.',
        demo: (
            <div className="p-4 space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
                    <span className="text-sm text-violet-300 truncate flex-1">mediastories.app/share/xK9mP...</span>
                    <span className="text-lg">📋</span>
                </div>
                <div className="flex gap-2 text-xs text-white/60">
                    <span className="rounded-full bg-green-500/20 px-2 py-0.5 text-green-400">Active</span>
                    <span>Expires in 72 hours</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/10">
                    <div className="h-1.5 w-2/3 rounded-full bg-gradient-to-r from-violet-500 to-pink-500" />
                </div>
            </div>
        ),
    },
    {
        emoji: '🎬',
        title: 'Cinematic Slideshow',
        description: 'Watch stories play out automatically frame by frame. Set custom durations per frame and add audio tracks for a true multimedia experience.',
        demo: (
            <div className="p-4">
                <div className="relative overflow-hidden rounded-lg bg-gradient-to-br from-indigo-900 to-purple-900 aspect-video flex items-center justify-center">
                    <span className="text-5xl">🌅</span>
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-2">
                        <p className="text-xs text-white text-center">A perfect golden hour</p>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white/20">
                        <div className="h-full w-1/3 bg-violet-400 animate-pulse" />
                    </div>
                </div>
                <div className="mt-2 flex justify-center gap-3">
                    {['⏮', '⏸', '⏭'].map((c) => (
                        <button key={c} className="text-white/60 hover:text-white text-sm">{c}</button>
                    ))}
                </div>
            </div>
        ),
    },
    {
        emoji: '🔔',
        title: 'Real-Time Notifications',
        description: "Stay in the loop. Get notified when friends send requests, accept your invites, or share new stories with you — all in real time.",
        demo: (
            <div className="p-4 space-y-2">
                {[
                    { icon: '👋', text: 'Alex accepted your friend request', time: '2m ago', unread: true },
                    { icon: '📖', text: 'Marcus shared "Summer Trip" with you', time: '1h ago', unread: true },
                    { icon: '✅', text: 'Your story link was viewed 12 times', time: '3h ago', unread: false },
                ].map((n, i) => (
                    <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2 ${n.unread ? 'bg-violet-500/20' : 'bg-white/5'}`}>
                        <span>{n.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-xs text-white leading-snug">{n.text}</p>
                            <p className="text-xs text-white/40">{n.time}</p>
                        </div>
                        {n.unread && <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-violet-400" />}
                    </div>
                ))}
            </div>
        ),
    },
    {
        emoji: '🛡',
        title: 'Admin & Moderation',
        description: 'Full admin dashboard with user management, feature flags, site config, activity logs, and a moderation queue for flagged content.',
        demo: (
            <div className="p-4 space-y-2">
                {[
                    { label: 'Total Users', value: '1,284', delta: '+12 today' },
                    { label: 'Active Stories', value: '3,901', delta: '+48 today' },
                    { label: 'Premium Users', value: '342', delta: '27%' },
                ].map((s) => (
                    <div key={s.label} className="flex items-center justify-between rounded-lg bg-white/10 px-3 py-2">
                        <span className="text-xs text-white/60">{s.label}</span>
                        <div className="text-right">
                            <span className="text-sm font-bold text-white">{s.value}</span>
                            <span className="ml-2 text-xs text-green-400">{s.delta}</span>
                        </div>
                    </div>
                ))}
            </div>
        ),
    },
];

const PRICING = [
    {
        name: 'Free',
        price: '$0',
        period: 'forever',
        highlight: false,
        features: ['5 stories', '10 friends', '3 shares per story', 'Public share links', 'Mobile-friendly viewer'],
        cta: 'Get started free',
        href: register,
    },
    {
        name: 'Premium',
        price: '$9',
        period: 'per month',
        highlight: true,
        features: ['Unlimited stories', 'Unlimited friends', 'Unlimited shares', 'Audio tracks', 'Priority support', 'Analytics'],
        cta: 'Go Premium',
        href: register,
    },
];

export default function Welcome({ canRegister = true }: { canRegister?: boolean }) {
    const { auth } = usePage<{ auth: { user?: { name: string } } }>().props;

    return (
        <>
            <Head title="Media Stories — Share Your World">
                <link rel="preconnect" href="https://fonts.bunny.net" />
                <link href="https://fonts.bunny.net/css?family=instrument-sans:400,500,600,700" rel="stylesheet" />
            </Head>

            <div className="min-h-screen bg-[#0d0d14] font-[instrument-sans] text-white antialiased">

                {/* Nav */}
                <nav className="fixed top-0 z-50 w-full border-b border-white/5 bg-[#0d0d14]/80 backdrop-blur-md">
                    <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
                        <div className="flex items-center gap-2 font-semibold text-lg">
                            <span className="text-2xl">🎞</span>
                            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                                Media Stories
                            </span>
                        </div>
                        <div className="flex items-center gap-3">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
                                >
                                    Go to Dashboard →
                                </Link>
                            ) : (
                                <>
                                    <Link
                                        href={login()}
                                        className="text-sm text-white/60 hover:text-white transition-colors"
                                    >
                                        Log in
                                    </Link>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 transition-colors"
                                        >
                                            Get started free
                                        </Link>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </nav>

                {/* Hero */}
                <section className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 pt-16">
                    {/* Background blobs */}
                    <div className="pointer-events-none absolute inset-0">
                        <div className="absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl" />
                        <div className="absolute right-1/4 bottom-1/4 h-96 w-96 translate-x-1/2 translate-y-1/2 rounded-full bg-pink-600/15 blur-3xl" />
                        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/10 blur-3xl" />
                    </div>

                    <div className="relative mx-auto max-w-4xl text-center">
                        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-1.5 text-sm text-violet-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-violet-400 animate-pulse" />
                            Share your world, one frame at a time
                        </div>

                        <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-7xl">
                            Stories that{' '}
                            <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-orange-400 bg-clip-text text-transparent">
                                come alive
                            </span>
                        </h1>

                        <p className="mx-auto mb-10 max-w-2xl text-lg text-white/60 md:text-xl">
                            Create beautiful photo and video stories, share them privately with friends,
                            or publish a link for the world to see. Media Stories makes it effortless.
                        </p>

                        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105"
                                >
                                    Go to Dashboard →
                                </Link>
                            ) : (
                                <>
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105"
                                        >
                                            Start for free — no card needed
                                        </Link>
                                    )}
                                    <Link
                                        href={login()}
                                        className="rounded-xl border border-white/10 bg-white/5 px-8 py-4 text-base font-medium text-white hover:bg-white/10 transition-colors"
                                    >
                                        Log in
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mini story preview */}
                        <div className="mt-16 mx-auto max-w-lg">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-1 backdrop-blur">
                                <div className="rounded-xl bg-gradient-to-br from-[#1a1a2e] to-[#16213e] p-4">
                                    <div className="mb-3 flex items-center gap-2">
                                        <div className="h-2 w-2 rounded-full bg-red-500" />
                                        <div className="h-2 w-2 rounded-full bg-yellow-500" />
                                        <div className="h-2 w-2 rounded-full bg-green-500" />
                                        <span className="ml-2 text-xs text-white/30">Summer in Japan 🇯🇵</span>
                                    </div>
                                    <div className="flex gap-2 overflow-hidden">
                                        {[
                                            { e: '⛩', label: 'Fushimi Inari' },
                                            { e: '🍜', label: 'Ramen in Kyoto' },
                                            { e: '🌸', label: 'Cherry Blossoms' },
                                            { e: '🗼', label: 'Tokyo Tower' },
                                        ].map((f, i) => (
                                            <div
                                                key={i}
                                                className={`flex flex-1 flex-col items-center justify-center rounded-lg py-4 transition-all ${i === 0 ? 'bg-violet-600/40 ring-2 ring-violet-500' : 'bg-white/5'}`}
                                            >
                                                <span className="text-3xl">{f.e}</span>
                                                <span className="mt-1 text-xs text-white/50 text-center leading-tight">{f.label}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-3 flex items-center justify-between text-xs text-white/30">
                                        <span>4 frames · 20s</span>
                                        <div className="flex gap-1">
                                            <div className="h-1 w-8 rounded-full bg-violet-500" />
                                            <div className="h-1 w-8 rounded-full bg-white/20" />
                                            <div className="h-1 w-8 rounded-full bg-white/20" />
                                            <div className="h-1 w-8 rounded-full bg-white/20" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Features */}
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-6xl">
                        <div className="mb-16 text-center">
                            <h2 className="mb-4 text-4xl font-bold">Everything you need</h2>
                            <p className="text-white/50 text-lg">Powerful tools to create, share, and experience stories</p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                            {FEATURES.map((feature) => (
                                <div
                                    key={feature.title}
                                    className="group rounded-2xl border border-white/8 bg-white/3 transition-all hover:border-violet-500/30 hover:bg-white/5"
                                >
                                    <div className="p-6 pb-2">
                                        <div className="mb-3 text-3xl">{feature.emoji}</div>
                                        <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                                        <p className="text-sm text-white/50 leading-relaxed">{feature.description}</p>
                                    </div>
                                    <div className="border-t border-white/5">
                                        {feature.demo}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Pricing */}
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-3xl">
                        <div className="mb-16 text-center">
                            <h2 className="mb-4 text-4xl font-bold">Simple pricing</h2>
                            <p className="text-white/50 text-lg">Start free. Upgrade when you need more.</p>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            {PRICING.map((plan) => (
                                <div
                                    key={plan.name}
                                    className={`relative rounded-2xl p-8 ${
                                        plan.highlight
                                            ? 'bg-gradient-to-b from-violet-600/20 to-pink-600/10 border border-violet-500/40'
                                            : 'border border-white/8 bg-white/3'
                                    }`}
                                >
                                    {plan.highlight && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-violet-600 to-pink-600 px-4 py-1 text-xs font-semibold text-white">
                                            Most popular
                                        </div>
                                    )}
                                    <div className="mb-6">
                                        <h3 className="mb-1 text-lg font-semibold">{plan.name}</h3>
                                        <div className="flex items-end gap-1">
                                            <span className="text-4xl font-bold">{plan.price}</span>
                                            <span className="mb-1 text-white/40 text-sm">/{plan.period}</span>
                                        </div>
                                    </div>
                                    <ul className="mb-8 space-y-3">
                                        {plan.features.map((f) => (
                                            <li key={f} className="flex items-center gap-3 text-sm">
                                                <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${plan.highlight ? 'bg-violet-500/30 text-violet-300' : 'bg-white/10 text-white/60'}`}>
                                                    ✓
                                                </span>
                                                <span className="text-white/70">{f}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    {canRegister && (
                                        <Link
                                            href={plan.href()}
                                            className={`block w-full rounded-xl py-3 text-center text-sm font-semibold transition-all hover:scale-[1.02] ${
                                                plan.highlight
                                                    ? 'bg-gradient-to-r from-violet-600 to-pink-600 text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40'
                                                    : 'border border-white/10 bg-white/5 text-white hover:bg-white/10'
                                            }`}
                                        >
                                            {plan.cta}
                                        </Link>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* CTA */}
                <section className="px-6 py-24">
                    <div className="mx-auto max-w-2xl text-center">
                        <div className="rounded-3xl border border-violet-500/20 bg-gradient-to-b from-violet-600/10 to-pink-600/5 p-12">
                            <p className="mb-4 text-5xl">🎞</p>
                            <h2 className="mb-4 text-4xl font-bold">Start telling your story</h2>
                            <p className="mb-8 text-white/50">
                                Join thousands of people sharing their moments in a whole new way.
                            </p>
                            {auth.user ? (
                                <Link
                                    href={dashboard()}
                                    className="inline-block rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-10 py-4 font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105"
                                >
                                    Go to Dashboard →
                                </Link>
                            ) : (
                                <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
                                    {canRegister && (
                                        <Link
                                            href={register()}
                                            className="rounded-xl bg-gradient-to-r from-violet-600 to-pink-600 px-10 py-4 font-semibold text-white shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-105"
                                        >
                                            Create your account
                                        </Link>
                                    )}
                                    <Link
                                        href={login()}
                                        className="text-sm text-white/50 hover:text-white transition-colors"
                                    >
                                        Already have an account? Log in →
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </section>

                {/* Footer */}
                <footer className="border-t border-white/5 px-6 py-8">
                    <div className="mx-auto flex max-w-6xl items-center justify-between text-sm text-white/30">
                        <div className="flex items-center gap-2">
                            <span>🎞</span>
                            <span>Media Stories</span>
                        </div>
                        <p>Built with Laravel & React</p>
                    </div>
                </footer>
            </div>
        </>
    );
}
