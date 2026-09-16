import {
    Activity01Icon,
    Add01Icon,
    ArrowTurnBackwardIcon,
    CancelCircleIcon,
    CheckmarkCircle02Icon,
    Delete02Icon,
    Download04Icon,
    Edit02Icon,
    Key01Icon,
    LockKeyIcon,
    LockPasswordIcon,
    Login03Icon,
    Logout03Icon,
    PlugSocketIcon,
    RefreshIcon,
    Unlink01Icon,
    Upload04Icon,
    UserAdd01Icon,
    UserRemove01Icon,
} from '@hugeicons/core-free-icons';
import type { AppIcon } from '@/components/ui/icon';
import type { ActivityValue } from '@/types';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'slate';

export type ActionPresentation = {
    label: string;
    icon: AppIcon;
    tone: Tone;
};

/** Marker (dot) classes per tone: subtle tint + readable icon, light and dark. */
export const toneClasses: Record<Tone, string> = {
    green: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
    red: 'bg-red-500/10 text-red-600 ring-red-500/20 dark:text-red-400',
    blue: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    gray: 'bg-zinc-500/10 text-zinc-600 ring-zinc-500/20 dark:text-zinc-400',
    slate: 'bg-muted text-muted-foreground ring-border',
};

/**
 * The single place that decides how each activity action looks. Unknown
 * (custom) actions fall back to a neutral style.
 */
const actions: Record<string, ActionPresentation> = {
    created: { label: 'Created', icon: Add01Icon, tone: 'green' },
    updated: { label: 'Updated', icon: Edit02Icon, tone: 'amber' },
    deleted: { label: 'Deleted', icon: Delete02Icon, tone: 'red' },
    trashed: { label: 'Trashed', icon: Delete02Icon, tone: 'red' },
    force_deleted: {
        label: 'Permanently deleted',
        icon: Delete02Icon,
        tone: 'red',
    },
    restored: { label: 'Restored', icon: ArrowTurnBackwardIcon, tone: 'blue' },
    login: { label: 'Logged in', icon: Login03Icon, tone: 'blue' },
    logout: { label: 'Logged out', icon: Logout03Icon, tone: 'gray' },
    connected: { label: 'Connected', icon: PlugSocketIcon, tone: 'green' },
    disconnected: { label: 'Disconnected', icon: Unlink01Icon, tone: 'red' },
    synced: { label: 'Synced', icon: RefreshIcon, tone: 'blue' },
    approved: { label: 'Approved', icon: CheckmarkCircle02Icon, tone: 'green' },
    rejected: { label: 'Rejected', icon: CancelCircleIcon, tone: 'red' },
    exported: { label: 'Exported', icon: Download04Icon, tone: 'blue' },
    imported: { label: 'Imported', icon: Upload04Icon, tone: 'blue' },
    assigned: { label: 'Assigned', icon: UserAdd01Icon, tone: 'green' },
    unassigned: { label: 'Unassigned', icon: UserRemove01Icon, tone: 'red' },
    granted: { label: 'Granted', icon: Key01Icon, tone: 'green' },
    revoked: { label: 'Revoked', icon: LockKeyIcon, tone: 'red' },
    password_reset_sent: {
        label: 'Password reset sent',
        icon: LockPasswordIcon,
        tone: 'blue',
    },
    password_changed: {
        label: 'Password changed',
        icon: LockPasswordIcon,
        tone: 'amber',
    },
};

export function actionPresentation(action: string): ActionPresentation {
    return (
        actions[action] ?? {
            label: humanizeField(action),
            icon: Activity01Icon,
            tone: 'slate',
        }
    );
}

/** "payment_status" → "Payment status", "createdBy" → "Created by" */
export function humanizeField(field: string): string {
    const words = field
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_.-]+/g, ' ')
        .trim()
        .toLowerCase();

    return words.charAt(0).toUpperCase() + words.slice(1);
}

const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Safe, readable text for any stored value. Never returns markup; React
 * escapes the result.
 */
export function formatActivityValue(value: ActivityValue): string {
    if (value === null || value === '') {
        return 'Empty';
    }

    if (typeof value === 'boolean') {
        return value ? 'Yes' : 'No';
    }

    if (typeof value === 'number') {
        return value.toLocaleString();
    }

    if (typeof value === 'string') {
        return isoDate.test(value) ? new Date(value).toLocaleString() : value;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return 'None';
        }

        const items = value.map((item) =>
            typeof item === 'object' && item !== null
                ? '…'
                : formatActivityValue(item),
        );

        return items.length > 5
            ? `${items.slice(0, 5).join(', ')} +${items.length - 5} more`
            : items.join(', ');
    }

    const keys = Object.keys(value);

    return keys.length === 0
        ? 'None'
        : `${keys.length} ${keys.length === 1 ? 'field' : 'fields'}: ${keys.slice(0, 3).map(humanizeField).join(', ')}${keys.length > 3 ? '…' : ''}`;
}

/** "Created user Jane Doe" → "created user Jane Doe" (after the actor's name). */
export function sentenceAfterActor(
    description: string | null,
    action: string,
): string {
    const text = description || actionPresentation(action).label;

    return text.charAt(0).toLowerCase() + text.slice(1);
}
