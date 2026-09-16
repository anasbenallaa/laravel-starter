import {
    Activity01Icon,
    Home09Icon,
    UserGroupIcon,
    UserShield01Icon,
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
import { useTranslation } from 'react-i18next';
import ActivityController from '@/actions/App/Http/Controllers/ActivityController';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import type { AppIcon } from '@/components/ui/icon';
import { useAppearance } from '@/hooks/use-appearance';
import { useAuthorization } from '@/hooks/use-authorization';
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
    /**
     * Extra terms that should match the query without being displayed (English;
     * the translated title and description are matched too).
     */
    keywords?: string[];
    icon: AppIcon;
    /** Internal URL to visit when the item is chosen. */
    href?: string;
    /** Custom handler when the item is chosen (used for actions). */
    onSelect?: () => void;
    /** Only listed when the user has this permission (or any of these). */
    permission?: string | string[];
};

/**
 * The registry of everything the global search can jump to. Built inside a hook
 * so entries can pull in live routing / appearance helpers.
 */
export function useSearchItems(): SearchItem[] {
    const { updateAppearance } = useAppearance();
    const { canAny } = useAuthorization();
    const { t } = useTranslation();

    return useMemo<SearchItem[]>(
        () =>
            [
                {
                    id: 'nav.dashboard',
                    title: t('navigation.dashboard'),
                    group: t('search.group.navigation'),
                    badge: t('search.group.navigation'),
                    description: t('search.items.dashboard'),
                    keywords: ['home', 'overview', 'start'],
                    icon: Home09Icon,
                    href: dashboard().url,
                },
                {
                    id: 'nav.notifications',
                    title: t('navigation.notifications'),
                    group: t('search.group.navigation'),
                    badge: t('search.group.navigation'),
                    description: t('search.items.notifications'),
                    keywords: ['alerts', 'inbox', 'unread', 'bell'],
                    icon: Notification03Icon,
                    href: notificationsIndex().url,
                },
                {
                    id: 'nav.activities',
                    title: t('navigation.activities'),
                    group: t('search.group.navigation'),
                    badge: t('search.group.navigation'),
                    description: t('search.items.activities'),
                    keywords: ['audit', 'history', 'log', 'timeline'],
                    icon: Activity01Icon,
                    href: ActivityController.index.url(),
                },
                {
                    id: 'admin.users',
                    title: t('navigation.users'),
                    group: t('navigation.group.administration'),
                    badge: t('search.badge.admin'),
                    description: t('search.items.users'),
                    keywords: ['people', 'accounts', 'access', 'members'],
                    icon: UserGroupIcon,
                    href: UserController.index.url(),
                    permission: 'users.view',
                },
                {
                    id: 'admin.roles',
                    title: t('navigation.roles_permissions'),
                    group: t('navigation.group.administration'),
                    badge: t('search.badge.admin'),
                    description: t('search.items.roles'),
                    keywords: [
                        'rbac',
                        'access',
                        'groups',
                        'matrix',
                        'capabilities',
                    ],
                    icon: UserShield01Icon,
                    href: RoleController.index.url(),
                    permission: ['roles.view', 'permissions.view'],
                },
                {
                    id: 'nav.profile',
                    title: t('settings.profile.head'),
                    group: t('search.group.settings'),
                    badge: t('search.group.settings'),
                    description: t('settings.profile.description'),
                    keywords: ['account', 'avatar', 'name', 'email'],
                    icon: UserIcon,
                    href: editProfile().url,
                },
                {
                    id: 'nav.security',
                    title: t('settings.security.head'),
                    group: t('search.group.settings'),
                    badge: t('search.group.settings'),
                    description: t('settings.security.description'),
                    keywords: [
                        'password',
                        '2fa',
                        'two factor',
                        'passkey',
                        'mfa',
                    ],
                    icon: Shield01Icon,
                    href: editSecurity().url,
                },
                {
                    id: 'appearance.light',
                    title: t('search.items.light_title'),
                    group: t('navigation.appearance'),
                    badge: t('search.badge.theme'),
                    description: t('search.items.light'),
                    keywords: ['theme', 'mode', 'bright', 'day'],
                    icon: Sun03Icon,
                    onSelect: () => updateAppearance('light'),
                },
                {
                    id: 'appearance.dark',
                    title: t('search.items.dark_title'),
                    group: t('navigation.appearance'),
                    badge: t('search.badge.theme'),
                    description: t('search.items.dark'),
                    keywords: ['theme', 'mode', 'night'],
                    icon: Moon02Icon,
                    onSelect: () => updateAppearance('dark'),
                },
                {
                    id: 'appearance.system',
                    title: t('search.items.system_title'),
                    group: t('navigation.appearance'),
                    badge: t('search.badge.theme'),
                    description: t('search.items.system'),
                    keywords: ['theme', 'mode', 'auto'],
                    icon: Settings01Icon,
                    onSelect: () => updateAppearance('system'),
                },
                {
                    id: 'action.logout',
                    title: t('navigation.log_out'),
                    group: t('search.group.account'),
                    badge: t('search.badge.action'),
                    description: t('search.items.log_out'),
                    keywords: ['sign out', 'exit', 'leave'],
                    icon: Logout01Icon,
                    onSelect: () => {
                        router.flushAll();
                        router.post(logout().url);
                    },
                },
            ].filter(
                (item) =>
                    !item.permission ||
                    canAny(
                        Array.isArray(item.permission)
                            ? item.permission
                            : [item.permission],
                    ),
            ),
        [updateAppearance, canAny, t],
    );
}
