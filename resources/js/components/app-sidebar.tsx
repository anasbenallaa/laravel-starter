import {
    Activity01Icon,
    Home09Icon,
    UserGroupIcon,
    UserShield01Icon,
} from '@hugeicons/core-free-icons';
import { Link } from '@inertiajs/react';
import ActivityController from '@/actions/App/Http/Controllers/ActivityController';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { useLocale } from '@/hooks/use-locale';
import { dashboard } from '@/routes';
import type { NavItem } from '@/types';

export function AppSidebar() {
    const dashboardUrl = dashboard();
    const { setOpenMobile } = useSidebar();
    const [searchOpen, setSearchOpen] = useState(false);
    const { canAny } = useAuthorization();
    const { t } = useTranslation();
    // The sidebar sits on the reading-start side: right in RTL languages.
    const { isRtl } = useLocale();

    // On mobile the sidebar is a sheet: close it once the user picks something.
    const closeMobile = () => setOpenMobile(false);

    const mainNavItems: NavItem[] = [
        {
            title: t('navigation.dashboard'),
            href: dashboardUrl,
            icon: Home09Icon,
        },
        {
            // Everyone sees their own history; activities.view.all sees all.
            title: t('navigation.activities'),
            href: ActivityController.index(),
            icon: Activity01Icon,
        },
    ];

    // Hidden unless permitted; the routes enforce the same permissions.
    const adminNavItems: NavItem[] = [
        {
            title: t('navigation.users'),
            href: UserController.index(),
            icon: UserGroupIcon,
            permission: 'users.view',
        },
        {
            title: t('navigation.roles_permissions'),
            href: RoleController.index(),
            icon: UserShield01Icon,
            permission: ['roles.view', 'permissions.view'],
        },
    ].filter((item) =>
        canAny(
            Array.isArray(item.permission)
                ? item.permission
                : [item.permission ?? ''],
        ),
    );

    return (
        <>
            <Sidebar
                collapsible="icon"
                variant="sidebar"
                side={isRtl ? 'right' : 'left'}
            >
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
                    <NavMain
                        items={mainNavItems}
                        label={t('navigation.group.workspace')}
                        onNavigate={closeMobile}
                    />
                    <NavMain
                        items={adminNavItems}
                        label={t('navigation.group.administration')}
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
