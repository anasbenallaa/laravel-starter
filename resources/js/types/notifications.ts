/** Mirrors App\Enums\NotificationLevel. */
export type NotificationLevel = 'info' | 'success' | 'warning' | 'error';

export type NotificationFilter = 'all' | 'unread' | 'read';

/** The JSON payload stored in notifications.data (NotificationData::toArray). */
export type AppNotificationData = {
    version: number;
    title: string;
    message: string;
    event: string;
    category: string | null;
    level: NotificationLevel;
    icon: string | null;
    action: {
        label: string | null;
        url: string;
    } | null;
    actor: {
        type: string | null;
        id: string | number | null;
        name: string | null;
    } | null;
    subject: {
        type: string | null;
        id: string | number | null;
    } | null;
    metadata: Record<string, unknown>;
    /**
     * Translation keys rendered in the reader's language; title, message and
     * action.label are the stored fallback. Absent on older rows.
     */
    translation?: {
        title: string | null;
        message: string | null;
        action_label: string | null;
        parameters: Record<string, string | number | boolean | null>;
    } | null;
};

/** A stored notification as returned by NotificationResource. */
export type AppNotification = {
    id: string;
    /** The event, e.g. "order.created" (see databaseType()). */
    type: string;
    data: AppNotificationData;
    read_at: string | null;
    created_at: string;
};

/** Shared on every Inertia response for signed-in users. */
export type NotificationSummary = {
    unreadCount: number;
    recent: AppNotification[];
};
