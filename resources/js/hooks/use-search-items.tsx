import {
    Home09Icon,
    Logout01Icon,
    Moon02Icon,
    Notification03Icon,
    Settings01Icon,
    Shield01Icon,
    Sun03Icon,
    UserIcon,
} from '@hugeicons/core-free-icons';
import { router } from '@inertiajs/react';
import { useMemo } from 'react';
import type { AppIcon } from '@/components/ui/icon';
import { useAppearance } from '@/hooks/use-appearance';
import { dashboard, logout } from '@/routes';
import { index as notificationsIndex } from '@/routes/notifications';
import { edit as editProfile } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';

export type SearchItem = {
    /** Stable identifier, unique across the whole registry. */
    id: string;
    /** Primary label shown in the result row. */
    title: string;
    /** Section the item is grouped under in the results list. */
    group: string;
    /** Short pill rendered next to the title (mirrors the group by default). */
    badge: string;
    /** Secondary line shown under the title. */
    description: string;
    /** Extra terms that should match the query without being displayed. */
    keywords?: string[];
    icon: AppIcon;
    /** Internal URL to visit when the item is chosen. */
    href?: string;
    /** Custom handler when the item is chosen (used for actions). */
    onSelect?: () => void;
};

/**
 * The registry of everything the global search can jump to. Built inside a hook
 * so entries can pull in live routing / appearance helpers.
 */
export function useSearchItems(): SearchItem[] {
    const { updateAppearance } = useAppearance();

    return useMemo<SearchItem[]>(
        () => [
            {
                id: 'nav.dashboard',
                title: 'Dashboard',
                group: 'Navigation',
                badge: 'Navigation',
                description: 'Go to the main dashboard',
                keywords: ['home', 'overview', 'start'],
                icon: Home09Icon,
                href: dashboard().url,
            },
            {
                id: 'nav.notifications',
                title: 'Notifications',
                group: 'Navigation',
                badge: 'Navigation',
                description: 'View and manage your notifications',
                keywords: ['alerts', 'inbox', 'unread', 'bell'],
                icon: Notification03Icon,
                href: notificationsIndex().url,
            },
            {
                id: 'nav.profile',
                title: 'Profile settings',
                group: 'Settings',
                badge: 'Settings',
                description:
                    'Update your name, email address, and profile picture',
                keywords: ['account', 'avatar', 'name', 'email'],
                icon: UserIcon,
                href: editProfile().url,
            },
            {
                id: 'nav.security',
                title: 'Security settings',
                group: 'Settings',
                badge: 'Settings',
                description:
                    'Manage your password, two-factor authentication, and passkeys',
                keywords: ['password', '2fa', 'two factor', 'passkey', 'mfa'],
                icon: Shield01Icon,
                href: editSecurity().url,
            },
            {
                id: 'appearance.light',
                title: 'Switch to light theme',
                group: 'Appearance',
                badge: 'Theme',
                description: 'Use the light color scheme',
                keywords: ['theme', 'mode', 'bright', 'day'],
                icon: Sun03Icon,
                onSelect: () => updateAppearance('light'),
            },
            {
                id: 'appearance.dark',
                title: 'Switch to dark theme',
                group: 'Appearance',
                badge: 'Theme',
                description: 'Use the dark color scheme',
                keywords: ['theme', 'mode', 'night'],
                icon: Moon02Icon,
                onSelect: () => updateAppearance('dark'),
            },
            {
                id: 'appearance.system',
                title: 'Match system theme',
                group: 'Appearance',
                badge: 'Theme',
                description: 'Follow your operating system setting',
                keywords: ['theme', 'mode', 'auto'],
                icon: Settings01Icon,
                onSelect: () => updateAppearance('system'),
            },
            {
                id: 'action.logout',
                title: 'Log out',
                group: 'Account',
                badge: 'Action',
                description: 'End your session and return to the login screen',
                keywords: ['sign out', 'exit', 'leave'],
                icon: Logout01Icon,
                onSelect: () => {
                    router.flushAll();
                    router.post(logout().url);
                },
            },
        ],
        [updateAppearance],
    );
}
