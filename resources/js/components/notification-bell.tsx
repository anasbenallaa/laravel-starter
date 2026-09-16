import {
    Notification03Icon,
    TickDouble02Icon,
} from '@hugeicons/core-free-icons';
import { Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { NotificationIcon } from '@/components/notification-icon';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { useFormatters } from '@/hooks/use-formatters';
import {
    formatBadgeCount,
    markAllNotificationsAsRead,
    notificationText,
    openNotification,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { index as notificationsIndex } from '@/routes/notifications';

/**
 * Header bell with an unread badge and a dropdown of the latest
 * notifications. Reads the `notificationSummary` shared Inertia prop.
 */
export function NotificationBell() {
    const { notificationSummary } = usePage().props;
    const { t } = useTranslation();
    const { relativeTime } = useFormatters();

    if (!notificationSummary) {
        return null;
    }

    const { unreadCount, recent } = notificationSummary;
    const badge = formatBadgeCount(unreadCount);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="relative size-8 rounded-full"
                    data-test="notification-bell"
                    aria-label={
                        unreadCount > 0
                            ? t('notifications.unread_label', {
                                  count: unreadCount,
                              })
                            : t('notifications.title')
                    }
                >
                    <Icon iconNode={Notification03Icon} className="size-5" />
                    {badge && (
                        <span className="bg-destructive ring-background absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] leading-none font-semibold text-white tabular-nums ring-2">
                            {badge}
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>

            <DropdownMenuContent
                align="end"
                sideOffset={8}
                // Phones: full width minus 16px each side, kept 16px from both
                // edges, so the panel sits centered. sm+: anchored to the bell.
                collisionPadding={16}
                className="w-[calc(100vw-2rem)] p-0 sm:w-96"
            >
                <div className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm font-semibold">
                        {t('notifications.title')}
                    </p>
                    {unreadCount > 0 && (
                        <span className="text-muted-foreground text-xs">
                            {t('notifications.unread_count', {
                                count: unreadCount,
                            })}
                        </span>
                    )}
                </div>

                <DropdownMenuSeparator className="my-0" />

                {recent.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <Icon
                            iconNode={Notification03Icon}
                            className="text-muted-foreground size-6"
                        />
                        <p className="text-muted-foreground text-sm">
                            {t('notifications.empty')}
                        </p>
                    </div>
                ) : (
                    <div className="max-h-96 overflow-y-auto p-1">
                        {recent.map((notification) => {
                            const unread = notification.read_at === null;
                            const text = notificationText(notification, t);

                            return (
                                <DropdownMenuItem
                                    key={notification.id}
                                    onSelect={() =>
                                        openNotification(notification)
                                    }
                                    className={cn(
                                        'items-start gap-3 rounded-md px-3 py-2.5',
                                        unread && 'bg-accent/50',
                                    )}
                                >
                                    <NotificationIcon
                                        notification={notification}
                                        className="size-8"
                                    />
                                    <div className="min-w-0 flex-1 space-y-0.5">
                                        <p
                                            className={cn(
                                                'truncate text-sm',
                                                unread
                                                    ? 'font-semibold'
                                                    : 'font-medium',
                                            )}
                                        >
                                            {text.title}
                                        </p>
                                        <p className="text-muted-foreground line-clamp-2 text-xs">
                                            {text.message}
                                        </p>
                                        <p className="text-muted-foreground/80 text-[11px]">
                                            {relativeTime(
                                                notification.created_at,
                                            )}
                                        </p>
                                    </div>
                                    {unread && (
                                        <span
                                            className="bg-primary mt-1.5 size-2 shrink-0 rounded-full"
                                            aria-label={t(
                                                'notifications.unread',
                                            )}
                                        />
                                    )}
                                </DropdownMenuItem>
                            );
                        })}
                    </div>
                )}

                <DropdownMenuSeparator className="my-0" />

                <div className="flex items-center justify-between gap-2 p-1">
                    <DropdownMenuItem
                        disabled={unreadCount === 0}
                        onSelect={(event) => {
                            event.preventDefault();
                            markAllNotificationsAsRead();
                        }}
                        className="text-xs"
                    >
                        <Icon iconNode={TickDouble02Icon} />
                        {t('notifications.mark_all_read')}
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild className="text-xs">
                        <Link href={notificationsIndex()} prefetch>
                            {t('notifications.view_all')}
                        </Link>
                    </DropdownMenuItem>
                </div>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
