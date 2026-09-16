import {
    Alert02Icon,
    CancelCircleIcon,
    CheckmarkCircle02Icon,
    Clock01Icon,
    CreditCardIcon,
    Download04Icon,
    InformationCircleIcon,
    Link01Icon,
    Mail01Icon,
    Notification03Icon,
    PackageIcon,
    RefreshIcon,
    Settings01Icon,
    Shield01Icon,
    Unlink01Icon,
    UserAdd01Icon,
    UserIcon,
} from '@hugeicons/core-free-icons';
import { router } from '@inertiajs/react';
import NotificationController from '@/actions/App/Http/Controllers/NotificationController';
import type { AppIcon } from '@/components/ui/icon';
import type { AppNotification, NotificationLevel } from '@/types';

type LevelPresentation = {
    label: string;
    icon: AppIcon;
    /** Classes for the tinted icon tile. */
    className: string;
};

/**
 * The single place that decides how each notification level looks.
 */
export const notificationLevels: Record<NotificationLevel, LevelPresentation> =
    {
        info: {
            label: 'Info',
            icon: InformationCircleIcon,
            className: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
        },
        success: {
            label: 'Success',
            icon: CheckmarkCircle02Icon,
            className:
                'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        },
        warning: {
            label: 'Warning',
            icon: Alert02Icon,
            className: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
        },
        error: {
            label: 'Error',
            icon: CancelCircleIcon,
            className: 'bg-red-500/10 text-red-600 dark:text-red-400',
        },
    };

/**
 * Icons a notification can request by name through its `icon` field. Add an
 * entry here when a feature needs a new one; unknown names fall back to the
 * level icon.
 */
export const notificationIcons: Record<string, AppIcon> = {
    bell: Notification03Icon,
    clock: Clock01Icon,
    'credit-card': CreditCardIcon,
    download: Download04Icon,
    link: Link01Icon,
    mail: Mail01Icon,
    package: PackageIcon,
    settings: Settings01Icon,
    shield: Shield01Icon,
    sync: RefreshIcon,
    unlink: Unlink01Icon,
    user: UserIcon,
    'user-add': UserAdd01Icon,
};

export function levelPresentation(
    notification: AppNotification,
): LevelPresentation {
    return (
        notificationLevels[notification.data.level] ?? notificationLevels.info
    );
}

export function notificationIcon(notification: AppNotification): AppIcon {
    const { icon } = notification.data;

    return (
        (icon ? notificationIcons[icon] : undefined) ??
        levelPresentation(notification).icon
    );
}

/** 0 → null (no badge), 1–99 → "n", 100+ → "99+". */
export function formatBadgeCount(count: number): string | null {
    if (count <= 0) {
        return null;
    }

    return count > 99 ? '99+' : String(count);
}

// Relative dates live in lib/dates.ts; re-exported for existing imports.
export { formatRelativeTime } from '@/lib/dates';

// ─── Actions ─────────────────────────────────────────────────────────
// Every action redirects back on the server, which refreshes both the shared
// bell data and the current page's props.

const stayOnPage = { preserveScroll: true, preserveState: true } as const;

/**
 * Handle a click on a notification: mark it as read and, when it has an
 * action URL, navigate there. Both happen in one request (the server
 * redirects after marking), so navigation can't cancel the read.
 */
export function openNotification(notification: AppNotification): void {
    const follow = Boolean(notification.data.action?.url);

    if (!follow && notification.read_at) {
        return;
    }

    router.patch(
        NotificationController.markAsRead.url(notification.id),
        { follow },
        follow ? {} : stayOnPage,
    );
}

export function markNotificationAsRead(notification: AppNotification): void {
    router.patch(
        NotificationController.markAsRead.url(notification.id),
        {},
        stayOnPage,
    );
}

export function markNotificationAsUnread(notification: AppNotification): void {
    router.patch(
        NotificationController.markAsUnread.url(notification.id),
        {},
        stayOnPage,
    );
}

export function deleteNotification(notification: AppNotification): void {
    router.delete(
        NotificationController.destroy.url(notification.id),
        stayOnPage,
    );
}

export function markAllNotificationsAsRead(): void {
    router.patch(NotificationController.markAllAsRead.url(), {}, stayOnPage);
}

export function clearReadNotifications(): void {
    router.delete(NotificationController.destroyRead.url(), stayOnPage);
}
