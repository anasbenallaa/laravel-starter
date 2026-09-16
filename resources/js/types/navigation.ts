import type { InertiaLinkProps } from '@inertiajs/react';
import type { AppIcon } from '@/components/ui/icon';

export type BreadcrumbItem = {
    /** Translation key, or the text itself when `literal` is set. */
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    /** The title is user data (e.g. a user's name): show it untranslated. */
    literal?: boolean;
};

export type NavItem = {
    /** Already translated. */
    title: string;
    href: NonNullable<InertiaLinkProps['href']>;
    icon?: AppIcon | null;
    isActive?: boolean;
    /** Only shown when the user has this permission (or any of these). */
    permission?: string | string[];
};
