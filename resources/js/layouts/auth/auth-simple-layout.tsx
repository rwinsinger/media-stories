import { Link } from '@inertiajs/react';
import type { AuthLayoutProps } from '@/types';
import { home } from '@/routes';

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    return (
        <div className="dark relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-[#0d0d14] p-6 md:p-10">
            {/* Background blobs */}
            <div className="pointer-events-none absolute inset-0">
                <div className="absolute left-1/4 top-1/3 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/20 blur-3xl" />
                <div className="absolute right-1/4 bottom-1/3 h-72 w-72 translate-x-1/2 translate-y-1/2 rounded-full bg-pink-600/15 blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                <div className="flex flex-col gap-8">
                    {/* Logo */}
                    <div className="flex flex-col items-center gap-4">
                        <Link
                            href={home()}
                            className="flex items-center gap-2 font-semibold text-lg text-white"
                        >
                            <span className="text-2xl">🎞</span>
                            <span className="bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
                                Media Stories
                            </span>
                        </Link>

                        <div className="space-y-1 text-center">
                            <h1 className="text-xl font-semibold text-white">{title}</h1>
                            <p className="text-sm text-white/50">{description}</p>
                        </div>
                    </div>

                    {/* Card */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm
                        [&_label]:text-white/80
                        [&_input]:text-white [&_input]:border-white/20 [&_input]:bg-white/8 [&_input]:placeholder:text-white/30
                        [&_input:focus-visible]:border-violet-500 [&_input:focus-visible]:ring-violet-500/30
                        [&_.text-muted-foreground]:text-white/50">
                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
}
