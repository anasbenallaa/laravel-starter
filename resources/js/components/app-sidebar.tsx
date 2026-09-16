import {
    Home09Icon,
    Key01Icon,
    UserGroupIcon,
    UserShield01Icon,
} from '@hugeicons/core-free-icons';
import { Link } from '@inertiajs/react';
import PermissionController from '@/actions/App/Http/Controllers/Admin/PermissionController';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { useState } from 'react';
import AppLogo from '@/components/app-logo';
import { GlobalSearch, GlobalSearchTrigger } from '@/components/global-search';
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
    SidebarTrigger,
    useSidebar,
} from '@/components/ui/sidebar';
import { useAuthorization } from '@/hooks/use-authorization';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const dashboardUrl = dashboard();
    const { setOpenMobile } = useSidebar();
    const [searchOpen, setSearchOpen] = useState(false);
    const { can } = useAuthorization();

    // On mobile the sidebar is a sheet: close it once the user picks something.
    const closeMobile = () => setOpenMobile(false);

    const mainNavItems: NavItem[] = [
        {
            title: 'Dashboard',
            href: dashboardUrl,
            icon: Home09Icon,
        },
    ];

    // Hidden unless permitted; the routes enforce the same permissions.
    const adminNavItems: NavItem[] = [
        {
            title: 'Users',
            href: UserController.index(),
            icon: UserGroupIcon,
            permission: 'users.view',
        },
        {
            title: 'Roles',
            href: RoleController.index(),
            icon: UserShield01Icon,
            permission: 'roles.view',
        },
        {
            title: 'Permissions',
            href: PermissionController.index(),
            icon: Key01Icon,
            permission: 'permissions.view',
        },
    ].filter((item) => can(item.permission));

    return (
        <>
            <Sidebar collapsible="icon" variant="sidebar">
                <SidebarHeader>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton size="lg" asChild>
                                <Link
                                    href={dashboardUrl}
                                    prefetch
                                    onClick={closeMobile}
                                >
                                    <AppLogo />
                                </Link>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>

                    <GlobalSearchTrigger
                        onOpen={() => {
                            closeMobile();
                            setSearchOpen(true);
                        }}
                    />
                </SidebarHeader>

                <SidebarContent>
                    <NavMain items={mainNavItems} onNavigate={closeMobile} />
                    <NavMain
                        items={adminNavItems}
                        label="Administration"
                        onNavigate={closeMobile}
                    />
                </SidebarContent>

                {/* Desktop only: on mobile the header holds the user menu and
                    sidebar trigger. */}
                <SidebarFooter className="max-md:hidden">
                    <div className="flex items-center gap-2 group-data-[collapsible=icon]:flex-col-reverse group-data-[collapsible=icon]:gap-1">
                        <div className="min-w-0 flex-1 group-data-[collapsible=icon]:flex-none">
                            <NavUser />
                        </div>
                        <SidebarTrigger className="text-sidebar-foreground/70 hover:text-sidebar-foreground size-8 shrink-0 rounded-md focus-visible:ring-0" />
                    </div>
                </SidebarFooter>
            </Sidebar>

            <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
        </>
    );
}
