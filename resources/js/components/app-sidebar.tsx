import { Link, usePage } from '@inertiajs/react';
import { CreditCard, LayoutGrid, Share2, ShieldCheck, Users } from 'lucide-react';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import type { NavItem } from '@/types';
import AppLogo from './app-logo';
import { dashboard } from '@/routes';
import { index as adminIndex } from '@/routes/admin';

const baseNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: dashboard(),
        icon: LayoutGrid,
    },
    {
        title: 'Friends',
        href: '/friends',
        icon: Users,
    },
    {
        title: 'Shared With Me',
        href: '/shared-stories',
        icon: Share2,
    },
    {
        title: 'Subscription',
        href: '/subscription',
        icon: CreditCard,
    },
];

export function AppSidebar() {
    const { auth } = usePage().props;
    const mainNavItems: NavItem[] = auth.user?.is_admin
        ? [...baseNavItems, { title: 'Admin', href: adminIndex.url(), icon: ShieldCheck }]
        : baseNavItems;

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href={dashboard()} prefetch>
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain items={mainNavItems} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
