import type { InertiaLinkProps } from '@inertiajs/react';
import type { AppIcon } from '@/components/ui/icon';

export type BreadcrumbItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
};

export type NavItem = {
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: AppIcon | null;
    isActive?: boolean;
    /** Only shown when the user has this permission (or any of these). */
    permission?: string | string[];
};
