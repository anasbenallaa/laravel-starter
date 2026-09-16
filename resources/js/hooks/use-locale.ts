import { router, usePage } from '@inertiajs/react';
import { useCallback } from 'react';
import LocaleController from '@/actions/App/Http/Controllers/LocaleController';
import { loadLocale } from '@/lib/i18n';
import type { Locale, Localization } from '@/types';

export type UseLocaleReturn = Localization & {
    /** Direction-based, never code-based, so future RTL languages just work. */
    isRtl: boolean;
    /** Save the language (session, and the user's account when signed in). */
    setLocale: (locale: Locale) => Promise<void>;
};

export function useLocale(): UseLocaleReturn {
    const localization = usePage().props.localization;

    const setLocale = useCallback(async (locale: Locale) => {
        // Download the language first so the page re-renders translated at once.
        await loadLocale(locale);

        router.post(
            LocaleController.update.url(),
            { locale },
            { preserveScroll: true, preserveState: true },
        );
    }, []);

    return {
        ...localization,
        isRtl: localization.direction === 'rtl',
        setLocale,
    };
}
