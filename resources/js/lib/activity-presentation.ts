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
import type { TFunction } from 'i18next';
import type { AppIcon } from '@/components/ui/icon';
import { formatDateTime, formatNumber } from '@/lib/dates';
import { permissionLabel } from '@/lib/permissions';
import type { Activity, ActivityValue } from '@/types';

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'gray' | 'slate';

export type ActionPresentation = {
    /** Translated. */
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
 * The single place that decides how each activity action looks. Labels come
 * from `activities.action.{action}`; unknown (custom) actions fall back to a
 * neutral style and a humanized label. Action values themselves are stored
 * identifiers and are never translated.
 */
const actions: Record<string, Omit<ActionPresentation, 'label'>> = {
    created: { icon: Add01Icon, tone: 'green' },
    updated: { icon: Edit02Icon, tone: 'amber' },
    deleted: { icon: Delete02Icon, tone: 'red' },
    trashed: { icon: Delete02Icon, tone: 'red' },
    force_deleted: { icon: Delete02Icon, tone: 'red' },
    restored: { icon: ArrowTurnBackwardIcon, tone: 'blue' },
    login: { icon: Login03Icon, tone: 'blue' },
    logout: { icon: Logout03Icon, tone: 'gray' },
    connected: { icon: PlugSocketIcon, tone: 'green' },
    disconnected: { icon: Unlink01Icon, tone: 'red' },
    synced: { icon: RefreshIcon, tone: 'blue' },
    approved: { icon: CheckmarkCircle02Icon, tone: 'green' },
    rejected: { icon: CancelCircleIcon, tone: 'red' },
    exported: { icon: Download04Icon, tone: 'blue' },
    imported: { icon: Upload04Icon, tone: 'blue' },
    assigned: { icon: UserAdd01Icon, tone: 'green' },
    unassigned: { icon: UserRemove01Icon, tone: 'red' },
    granted: { icon: Key01Icon, tone: 'green' },
    revoked: { icon: LockKeyIcon, tone: 'red' },
    password_reset_sent: { icon: LockPasswordIcon, tone: 'blue' },
    password_changed: { icon: LockPasswordIcon, tone: 'amber' },
};

export function actionPresentation(
    action: string,
    t: TFunction,
): ActionPresentation {
    const known = actions[action];

    return {
        icon: known?.icon ?? Activity01Icon,
        tone: known?.tone ?? 'slate',
        label: t(`activities.action.${action}`, {
            defaultValue: humanize(action),
        }),
    };
}

/** "payment_status" → "Payment status", "createdBy" → "Created by" */
function humanize(field: string): string {
    const words = field
        .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
        .replace(/[_.-]+/g, ' ')
        .trim()
        .toLowerCase();

    return words.charAt(0).toUpperCase() + words.slice(1);
}

/** Field name label from `activities.field.{field}`, humanized otherwise. */
export function fieldLabel(field: string, t: TFunction): string {
    return t(`activities.field.${field}`, { defaultValue: humanize(field) });
}

const isoDate = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

/**
 * Safe, readable text for any stored value, in the current language. Never
 * returns markup; React escapes the result. Stored text itself is user data
 * and is shown as-is.
 */
export function formatActivityValue(
    value: ActivityValue,
    t: TFunction,
    locale: string,
): string {
    if (value === null || value === '') {
        return t('activities.value.empty');
    }

    if (typeof value === 'boolean') {
        return value ? t('common.yes') : t('common.no');
    }

    if (typeof value === 'number') {
        return formatNumber(value, locale);
    }

    if (typeof value === 'string') {
        return isoDate.test(value) ? formatDateTime(value, locale) : value;
    }

    if (Array.isArray(value)) {
        if (value.length === 0) {
            return t('common.none');
        }

        const items = value.map((item) =>
            typeof item === 'object' && item !== null
                ? '…'
                : formatActivityValue(item, t, locale),
        );
        const list = (parts: string[]) =>
            new Intl.ListFormat(locale, {
                style: 'narrow',
                type: 'unit',
            }).format(parts);

        return items.length > 5
            ? t('activities.value.list_more', {
                  items: list(items.slice(0, 5)),
                  count: items.length - 5,
              })
            : list(items);
    }

    const keys = Object.keys(value);

    return keys.length === 0
        ? t('common.none')
        : t('activities.value.fields', {
              count: keys.length,
              fields:
                  keys
                      .slice(0, 3)
                      .map((key) => fieldLabel(key, t))
                      .join(', ') + (keys.length > 3 ? '…' : ''),
          });
}

/** "User" → "activities.subject.user" (the type in a sentence, e.g. "user"). */
function subjectType(activity: Activity, t: TFunction): string {
    const type = activity.subject_type ?? '';
    const key = type.trim().toLowerCase().replace(/\s+/g, '_');

    return t(`activities.subject.${key}`, { defaultValue: type.toLowerCase() });
}

function metadataString(activity: Activity, key: string): string | null {
    const value = activity.metadata[key];

    return typeof value === 'string' ? value : null;
}

function metadataNumber(activity: Activity, key: string): number | null {
    const value = activity.metadata[key];

    return typeof value === 'number' ? value : null;
}

/**
 * The sentence after the actor's name ("created user Jane Doe"), built at
 * render time in the viewer's language from the stored action, subject and
 * metadata. Actions without a sentence (custom modules) fall back to the
 * stored English description. Names, labels and values stay as stored.
 */
export function activitySentence(activity: Activity, t: TFunction): string {
    const label = activity.subject_label;
    const lifecycle = [
        'created',
        'updated',
        'deleted',
        'trashed',
        'restored',
        'force_deleted',
    ];

    if (lifecycle.includes(activity.action) && label) {
        return t(`activities.sentence.${activity.action}`, {
            subject: subjectType(activity, t),
            label,
        });
    }

    const role = metadataString(activity, 'role');
    const permission = metadataString(activity, 'permission');

    switch (activity.action) {
        case 'login':
        case 'logout':
        case 'password_changed':
            return t(`activities.sentence.${activity.action}`);
        case 'password_reset_sent':
            if (label) {
                return t('activities.sentence.password_reset_sent', { label });
            }
            break;
        case 'assigned':
        case 'unassigned':
            if (label && role) {
                return t(`activities.sentence.${activity.action}`, {
                    role,
                    label,
                });
            }
            break;
        case 'granted':
        case 'revoked':
            if (label && permission) {
                return t(`activities.sentence.${activity.action}`, {
                    permission: permissionLabel(permission, t),
                    label,
                });
            }
            break;
        case 'exported': {
            const rows = metadataNumber(activity, 'rows');

            if (rows !== null) {
                return t('activities.sentence.exported', { count: rows });
            }
            break;
        }
        case 'synced': {
            const created = metadataNumber(activity, 'created');

            if (created !== null) {
                return t('activities.sentence.synced', { count: created });
            }
            break;
        }
    }

    const text =
        activity.description || actionPresentation(activity.action, t).label;

    return text.charAt(0).toLocaleLowerCase() + text.slice(1);
}
