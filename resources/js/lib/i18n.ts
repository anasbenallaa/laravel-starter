import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

/**
 * Translations come straight from lang/{locale}.json, the single source shared
 * with Laravel. Each language is its own lazily loaded chunk, so only the
 * active language (plus the English fallback) is downloaded.
 */
type TranslationFile = { default: Record<string, string> };

const loaders = import.meta.glob<TranslationFile>('../../../lang/*.json');

export async function loadLocale(locale: string): Promise<void> {
    if (i18n.hasResourceBundle(locale, 'translation')) {
        return;
    }

    const loader = loaders[`../../../lang/${locale}.json`];

    if (!loader) {
        // Usually lang/ was not available when the assets were built.
        console.error(
            `[i18n] No translation file bundled for "${locale}" (lang/${locale}.json).`,
        );

        return;
    }

    const file = await loader();
    i18n.addResourceBundle(locale, 'translation', file.default, true, true);
}

export async function setupI18n(
    locale: string,
    fallbackLocale: string,
): Promise<void> {
    await i18n.use(initReactI18next).init({
        lng: locale,
        fallbackLng: fallbackLocale,
        resources: {},
        partialBundledLanguages: true,
        // Keys are flat ("users.table.name"), not nested objects.
        keySeparator: false,
        nsSeparator: false,
        // React already escapes rendered text.
        interpolation: { escapeValue: false },
        returnEmptyString: false,
        react: { useSuspense: false },
        // Missing keys fall back to English; in development they are reported.
        saveMissing: import.meta.env.DEV,
        missingKeyHandler: (languages, _namespace, key) => {
            if (import.meta.env.DEV) {
                console.warn(
                    `[i18n] Missing translation "${key}" for ${languages.join(', ')}`,
                );
            }
        },
    });

    await Promise.all([loadLocale(locale), loadLocale(fallbackLocale)]);
    await i18n.changeLanguage(locale);
}

/** Load a language's file (if needed) and make it active. */
export async function activateLocale(locale: string): Promise<void> {
    await loadLocale(locale);

    if (i18n.language !== locale) {
        await i18n.changeLanguage(locale);
    }
}

export { i18n };
