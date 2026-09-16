/** Codes from config/locales.php. Add a code here when adding a language. */
export type Locale = 'en' | 'fr' | 'ar';

export type Direction = 'ltr' | 'rtl';

export type LocaleOption = {
    code: Locale;
    name: string;
    nativeName: string;
    direction: Direction;
};

/** Shared on every Inertia response (HandleInertiaRequests). */
export type Localization = {
    locale: Locale;
    direction: Direction;
    fallbackLocale: Locale;
    supportedLocales: LocaleOption[];
};
