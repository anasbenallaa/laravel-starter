import { createInertiaApp } from '@inertiajs/react';
import { LocaleRoot } from '@/components/locale-root';
import { TooltipProvider } from '@/components/ui/tooltip';
import { initializeTheme } from '@/hooks/use-appearance';
import { setupI18n } from '@/lib/i18n';
import AppLayout from '@/layouts/app-layout';
import AuthLayout from '@/layouts/auth-layout';
import SettingsLayout from '@/layouts/settings/layout';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

type InitialPage = {
    props?: { localization?: { locale?: string; fallbackLocale?: string } };
};

function initialLocalization(): { locale: string; fallbackLocale: string } {
    const element = document.querySelector('script[data-page="app"]');

    try {
        const page = JSON.parse(element?.textContent ?? '{}') as InitialPage;

        return {
            locale: page.props?.localization?.locale ?? 'en',
            fallbackLocale: page.props?.localization?.fallbackLocale ?? 'en',
        };
    } catch {
        return { locale: 'en', fallbackLocale: 'en' };
    }
}

const { locale, fallbackLocale } = initialLocalization();

// Load the active language before the first render, so text never flashes as keys.
void setupI18n(locale, fallbackLocale).then(() =>
    createInertiaApp({
        title: (title) => (title ? `${title} - ${appName}` : appName),
        // LocaleRoot is outermost on every page: language, direction, toasts.
        layout: (name) => {
            switch (true) {
                case name.startsWith('auth/'):
                    return [LocaleRoot, AuthLayout];
                case name.startsWith('settings/'):
                    return [LocaleRoot, AppLayout, SettingsLayout];
                default:
                    return [LocaleRoot, AppLayout];
            }
        },
        strictMode: true,
        withApp(app) {
            return <TooltipProvider delayDuration={0}>{app}</TooltipProvider>;
        },
        progress: {
            color: '#4B5563',
        },
    }),
);

// This will set light / dark mode on load...
initializeTheme();
