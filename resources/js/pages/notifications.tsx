import {
    ArrowLeft01Icon,
    ArrowRight01Icon,
    Delete02Icon,
    MailOpen01Icon,
    MoreHorizontalIcon,
    Notification03Icon,
    TickDouble02Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, usePage } from '@inertiajs/react';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useFormatters } from '@/hooks/use-formatters';
import {
    clearReadNotifications,
    deleteNotification,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    markNotificationAsUnread,
    notificationText,
    openNotification,
} from '@/lib/notifications';
import { cn } from '@/lib/utils';
import { index } from '@/routes/notifications';
import type {
    AppNotification,
    NotificationFilter,
    PaginatedResource,
} from '@/types';

type Props = {
    notifications: PaginatedResource<AppNotification>;
    filter: NotificationFilter;
};

const filters: NotificationFilter[] = ['all', 'unread', 'read'];

export default function Notifications({ notifications, filter }: Props) {
    const unreadCount = usePage().props.notificationSummary?.unreadCount ?? 0;
    const { data, meta, links } = notifications;
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('notifications.title')} />

            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                    <div className="space-y-0.5">
                        <h1 className="text-xl font-semibold tracking-tight">
                            {t('notifications.title')}
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {unreadCount > 0
                                ? t('notifications.you_have_unread', {
                                      count: unreadCount,
                                  })
                                : t('notifications.stay_up_to_date')}
                        </p>
                    </div>

                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={unreadCount === 0}
                            onClick={markAllNotificationsAsRead}
                        >
                            <Icon iconNode={TickDouble02Icon} />
                            {t('notifications.mark_all_read')}
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={filter === 'unread' || meta.total === 0}
                            onClick={clearReadNotifications}
                        >
                            <Icon iconNode={Delete02Icon} />
                            {t('notifications.clear_read')}
                        </Button>
                    </div>
                </div>

                <ToggleGroup
                    type="single"
                    variant="outline"
                    size="sm"
                    value={filter}
                    className="self-start"
                >
                    {filters.map((option) => (
                        <ToggleGroupItem
                            key={option}
                            value={option}
                            asChild
                            className="px-3"
                        >
                            <Link
                                href={index({
                                    query: {
                                        filter:
                                            option === 'all'
                                                ? undefined
                                                : option,
                                    },
                                })}
                                preserveScroll
                            >
                                {t(`notifications.filter.${option}`)}
                            </Link>
                        </ToggleGroupItem>
                    ))}
                </ToggleGroup>

                {data.length === 0 ? (
                    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed px-6 py-16 text-center">
                        <span className="bg-muted flex size-12 items-center justify-center rounded-full">
                            <Icon
                                iconNode={Notification03Icon}
                                className="text-muted-foreground size-6"
                            />
                        </span>
                        <div className="space-y-1">
                            <p className="font-medium">
                                {t(`notifications.empty_state.${filter}_title`)}
                            </p>
                            <p className="text-muted-foreground text-sm">
                                {t(`notifications.empty_state.${filter}_body`)}
                            </p>
                        </div>
                    </div>
                ) : (
                    <ul className="divide-y overflow-hidden rounded-xl border">
                        {data.map((notification) => (
                            <NotificationRow
                                key={notification.id}
                                notification={notification}
                            />
                        ))}
                    </ul>
                )}

                {meta.last_page > 1 && (
                    <nav
                        className="flex items-center justify-between gap-4"
                        aria-label={t('table.pagination')}
                    >
                        <p className="text-muted-foreground text-sm">
                            {t('notifications.page_of', {
                                page: meta.current_page,
                                total: meta.last_page,
                            })}
                        </p>
                        <div className="flex gap-2">
                            <PageLink
                                href={links.prev}
                                label={t('table.previous')}
                            >
                                <Icon
                                    iconNode={ArrowLeft01Icon}
                                    className="rtl:rotate-180"
                                />
                                {t('table.previous')}
                            </PageLink>
                            <PageLink href={links.next} label={t('table.next')}>
                                {t('table.next')}
                                <Icon
                                    iconNode={ArrowRight01Icon}
                                    className="rtl:rotate-180"
                                />
                            </PageLink>
                        </div>
                    </nav>
                )}
            </div>
        </>
    );
}

function NotificationRow({ notification }: { notification: AppNotification }) {
    const unread = notification.read_at === null;
    const { t } = useTranslation();
    const { relativeTime, dateTime } = useFormatters();
    const { title, message, actionLabel } = notificationText(notification, t);

    return (
        <li
            className={cn(
                'group relative flex items-start gap-3 p-4 transition-colors',
                unread ? 'bg-accent/40' : 'hover:bg-accent/30',
            )}
        >
            {unread && (
                <span
                    className="bg-primary absolute start-1.5 top-1/2 size-1.5 -translate-y-1/2 rounded-full"
                    aria-label={t('notifications.unread')}
                />
            )}

            <button
                type="button"
                onClick={() => openNotification(notification)}
                className="focus-visible:ring-ring flex min-w-0 flex-1 items-start gap-3 rounded-md text-start focus-visible:ring-2 focus-visible:outline-none"
            >
                <NotificationIcon notification={notification} />
                <span className="min-w-0 flex-1 space-y-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-x-3">
                        <span
                            className={cn(
                                'text-sm',
                                unread ? 'font-semibold' : 'font-medium',
                            )}
                        >
                            {title}
                        </span>
                        <time
                            dateTime={notification.created_at}
                            title={dateTime(notification.created_at)}
                            className="text-muted-foreground text-xs whitespace-nowrap"
                        >
                            {relativeTime(notification.created_at)}
                        </time>
                    </span>
                    <span className="text-muted-foreground block text-sm">
                        {message}
                    </span>
                    {actionLabel && (
                        <span className="text-primary block text-sm font-medium underline-offset-4 group-hover:underline">
                            {actionLabel}
                        </span>
                    )}
                </span>
            </button>

            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 shrink-0"
                        aria-label={t('notifications.actions')}
                    >
                        <Icon iconNode={MoreHorizontalIcon} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    {unread ? (
                        <DropdownMenuItem
                            onSelect={() =>
                                markNotificationAsRead(notification)
                            }
                        >
                            <Icon iconNode={TickDouble02Icon} />
                            {t('notifications.mark_read')}
                        </DropdownMenuItem>
                    ) : (
                        <DropdownMenuItem
                            onSelect={() =>
                                markNotificationAsUnread(notification)
                            }
                        >
                            <Icon iconNode={MailOpen01Icon} />
                            {t('notifications.mark_unread')}
                        </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        variant="destructive"
                        onSelect={() => deleteNotification(notification)}
                    >
                        <Icon iconNode={Delete02Icon} />
                        {t('common.delete')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </li>
    );
}

function PageLink({
    href,
    label,
    children,
}: {
    href: string | null;
    label: string;
    children: React.ReactNode;
}) {
    if (!href) {
        return (
            <Button variant="outline" size="sm" disabled aria-label={label}>
                {children}
            </Button>
        );
    }

    return (
        <Button variant="outline" size="sm" asChild>
            <Link href={href} aria-label={label}>
                {children}
            </Link>
        </Button>
    );
}

Notifications.layout = () => ({
    breadcrumbs: [
        {
            title: 'navigation.notifications',
            href: index(),
        },
    ],
});
