/**
 * Locale-aware, dependency-free date and number formatting (Intl). Prefer the
 * useFormatters() hook in components; it passes the active locale.
 */

const relativeTimeUnits: [Intl.RelativeTimeFormatUnit, number][] = [
    ['year', 60 * 60 * 24 * 365],
    ['month', 60 * 60 * 24 * 30],
    ['week', 60 * 60 * 24 * 7],
    ['day', 60 * 60 * 24],
    ['hour', 60 * 60],
    ['minute', 60],
];

const cache = new Map<
    string,
    Intl.RelativeTimeFormat | Intl.DateTimeFormat | Intl.NumberFormat
>();

function cached<
    T extends Intl.RelativeTimeFormat | Intl.DateTimeFormat | Intl.NumberFormat,
>(key: string, create: () => T): T {
    if (!cache.has(key)) {
        cache.set(key, create());
    }

    return cache.get(key) as T;
}

function capitalize(text: string): string {
    return text.charAt(0).toLocaleUpperCase() + text.slice(1);
}

/** "Just now", "2 minutes ago" / "il y a 2 minutes" / "منذ دقيقتين", "Yesterday"… */
export function formatRelativeTime(
    isoDate: string,
    locale = 'en',
    justNow = 'Just now',
    now: number = Date.now(),
): string {
    const seconds = Math.round((new Date(isoDate).getTime() - now) / 1000);

    if (Math.abs(seconds) < 45) {
        return justNow;
    }

    const format = cached(
        `relative:${locale}`,
        () => new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }),
    );

    for (const [unit, unitSeconds] of relativeTimeUnits) {
        if (Math.abs(seconds) >= unitSeconds) {
            return capitalize(
                format.format(Math.trunc(seconds / unitSeconds), unit),
            );
        }
    }

    return capitalize(format.format(-1, 'minute'));
}

/** "September 16, 2026 at 5:42 PM" / "16 septembre 2026 à 17:42" */
export function formatDateTime(isoDate: string, locale = 'en'): string {
    return cached(
        `datetime:${locale}`,
        () =>
            new Intl.DateTimeFormat(locale, {
                dateStyle: 'long',
                timeStyle: 'short',
            }),
    ).format(new Date(isoDate));
}

/** "Sep 16, 2026" / "16 sept. 2026" */
export function formatDate(isoDate: string, locale = 'en'): string {
    return cached(
        `date:${locale}`,
        () => new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }),
    ).format(new Date(isoDate));
}

/** "1,284" / "1 284". Not for identifiers (order numbers, IDs, IPs). */
export function formatNumber(value: number, locale = 'en'): string {
    return cached(
        `number:${locale}`,
        () => new Intl.NumberFormat(locale),
    ).format(value);
}
