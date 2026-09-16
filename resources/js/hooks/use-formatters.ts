import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
    formatDate,
    formatDateTime,
    formatNumber,
    formatRelativeTime,
} from '@/lib/dates';

/** Date, relative time and number formatting in the active language. */
export function useFormatters() {
    const { t, i18n } = useTranslation();
    const locale = i18n.language;

    return useMemo(
        () => ({
            relativeTime: (isoDate: string) =>
                formatRelativeTime(isoDate, locale, t('common.just_now')),
            dateTime: (isoDate: string) => formatDateTime(isoDate, locale),
            date: (isoDate: string) => formatDate(isoDate, locale),
            number: (value: number) => formatNumber(value, locale),
        }),
        [locale, t],
    );
}
