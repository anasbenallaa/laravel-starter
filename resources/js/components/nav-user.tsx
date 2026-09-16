import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { usePage } from '@inertiajs/react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { SidebarMenuButton } from '@/components/ui/sidebar';
import { UserInfo } from '@/components/user-info';
import { UserMenuContent } from '@/components/user-menu-content';
import { useIsMobile } from '@/hooks/use-mobile';

export function NavUser() {
    const { auth } = usePage().props;
    const isMobile = useIsMobile();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                    size="lg"
                    className="group border-sidebar-border bg-sidebar-accent/40 text-sidebar-accent-foreground hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent h-8 rounded-full border p-1 group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:border-0 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0! focus-visible:ring-0"
                    data-test="sidebar-menu-button"
                >
                    <UserInfo
                        user={auth.user}
                        avatarClassName="size-6 group-data-[collapsible=icon]:size-8!"
                    />
                    <Icon
                        iconNode={ArrowDown01Icon}
                        className="ms-auto size-4 shrink-0 opacity-60 group-data-[collapsible=icon]:hidden"
                    />
                </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
                className="min-w-56 rounded-lg"
                align="start"
                side={isMobile ? 'bottom' : 'top'}
                sideOffset={8}
            >
                <UserMenuContent user={auth.user} />
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
