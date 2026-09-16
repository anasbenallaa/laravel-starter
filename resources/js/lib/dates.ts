/** Shared, dependency-free date formatting. */

const relativeTimeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
];

const relativeTimeFormat = new Intl.RelativeTimeFormat('en', {
    numeric: 'auto',
});

/** "Just now", "2 minutes ago", "Yesterday", "3 days ago", ... */
export function formatRelativeTime(
    isoDate: string,
    now: number = Date.now(),
): string {
    const seconds = Math.round((new Date(isoDate).getTime() - now) / 1000);

    if (Math.abs(seconds) < 45) {
        return 'Just now';
    }

    for (const [unit, unitSeconds] of relativeTimeUnits) {
        if (Math.abs(seconds) >= unitSeconds) {
            const text = relativeTimeFormat.format(
                Math.trunc(seconds / unitSeconds),
                unit,
            );

            return text.charAt(0).toUpperCase() + text.slice(1);
        }
    }

    return relativeTimeFormat.format(-1, 'minute');
}

const dateTimeFormat = new Intl.DateTimeFormat('en', {
    dateStyle: 'long',
    timeStyle: 'short',
});

/** "September 16, 2026 at 5:42 PM" */
export function formatDateTime(isoDate: string): string {
    return dateTimeFormat.format(new Date(isoDate));
}
