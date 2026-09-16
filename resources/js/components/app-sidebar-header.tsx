import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { usePage } from '@inertiajs/react';
import { Breadcrumbs } from '@/components/breadcrumbs';
import { NotificationBell } from '@/components/notification-bell';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import type { BreadcrumbItem as BreadcrumbItemType } from '@/types';

export function AppSidebarHeader({
    breadcrumbs = [],
}: {
    breadcrumbs?: BreadcrumbItemType[];
}) {
    const { auth } = usePage().props;

    return (
        <header className="bg-background/80 border-sidebar-border/50 sticky top-0 z-20 flex h-16 shrink-0 items-center gap-2 border-b px-6 backdrop-blur transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 md:px-4">
            <div className="flex min-w-0 flex-1 items-center gap-2">
                {/* Mobile only: opens the sidebar sheet (desktop toggle lives
                    in the sidebar footer). */}
                <SidebarTrigger className="-ml-1 focus-visible:ring-0 md:hidden" />
                <Breadcrumbs breadcrumbs={breadcrumbs} />
            </div>

            <div className="flex shrink-0 items-center gap-2">
                <NotificationBell />

                {/* Mobile only: user menu, right-aligned. On desktop it lives in
                the sidebar footer. */}
                <div className="md:hidden">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button
                                type="button"
                                className="group border-sidebar-border bg-sidebar-accent/40 text-sidebar-accent-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent flex h-8 shrink-0 items-center gap-1 rounded-full border p-1 outline-hidden"
                                data-test="header-user-menu"
                                aria-label="Open user menu"
                            >
                                <UserInfo
                                    user={auth.user}
                                    showName={false}
                                    avatarClassName="size-6"
                                />
                                <Icon
                                    iconNode={ArrowDown01Icon}
                                    className="size-4 shrink-0 opacity-60 transition-transform group-data-[state=open]:rotate-180"
                                />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                            className="min-w-56 rounded-lg"
                            align="end"
                            sideOffset={8}
                        >
                            <UserMenuContent user={auth.user} />
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>
        </header>
    );
}
