import { Link } from '@inertiajs/react';
import { BarChart2, BookOpen, Flag, Settings, Shield, SlidersHorizontal, Users } from 'lucide-react';
import AppLayout from '@/layouts/app-layout';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { BreadcrumbItem } from '@/types';
import { index as adminIndex, analytics, config, features, logs, moderation, stories, users } from '@/routes/admin';

const adminNavItems = [
    { title: 'Analytics', href: analytics.url(), icon: BarChart2 },
    { title: 'Users', href: users.url(), icon: Users },
    { title: 'Stories', href: stories.url(), icon: BookOpen },
    { title: 'Moderation', href: moderation.url(), icon: Flag },
    { title: 'Logs', href: logs.url(), icon: Shield },
    { title: 'Features', href: features.url(), icon: SlidersHorizontal },
    { title: 'Config', href: config.url(), icon: Settings },
];

interface Props {
    children: React.ReactNode;
    breadcrumbs?: BreadcrumbItem[];
}

export default function AdminLayout({ children, breadcrumbs = [] }: Props) {
    const { whenCurrentUrl } = useCurrentUrl();

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <div className="border-b border-sidebar-border/80 bg-muted/30">
                <div className="mx-auto flex h-11 items-center gap-1 overflow-x-auto px-4 md:max-w-7xl">
                    {adminNavItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground ${whenCurrentUrl(item.href, 'bg-accent text-accent-foreground')}`}
                        >
                            <item.icon className="h-3.5 w-3.5" />
                            {item.title}
                        </Link>
                    ))}
                </div>
            </div>
            {children}
        </AppLayout>
    );
}
