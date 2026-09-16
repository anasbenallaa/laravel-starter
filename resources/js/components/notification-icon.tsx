import { Icon } from '@/components/ui/icon';
import { levelPresentation, notificationIcon } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import type { AppNotification } from '@/types';

/** Level-tinted icon tile shown next to a notification. */
export function NotificationIcon({
    notification,
    className,
}: {
    notification: AppNotification;
    className?: string;
}) {
    return (
        <span
            className={cn(
                'flex size-9 shrink-0 items-center justify-center rounded-lg',
                levelPresentation(notification).className,
                className,
            )}
        >
            <Icon
                iconNode={notificationIcon(notification)}
                className="size-4.5 text-current"
            />
        </span>
    );
}
