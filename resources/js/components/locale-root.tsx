import { usePage } from '@inertiajs/react';
import { DirectionProvider } from '@radix-ui/react-direction';
import { useEffect, useState, type ReactNode } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { activateLocale, i18n } from '@/lib/i18n';

/**
 * Outermost layout of every page. Keeps i18next, <html lang dir> and Radix
 * components (menus, dialogs, sheets, selects, tooltips) in the active
 * locale's language and direction. The only place direction is applied.
 */
export function LocaleRoot({ children }: { children: ReactNode }) {
    const { locale, direction } = usePage().props.localization;
    const [, rerender] = useState(0);

    useEffect(() => {
        document.documentElement.lang = locale;
        document.documentElement.dir = direction;

        if (i18n.language !== locale) {
            void activateLocale(locale).then(() =>
                rerender((value) => value + 1),
            );
        }
    }, [locale, direction]);

    return (
        <DirectionProvider dir={direction}>
            {children}
            <Toaster
                dir={direction}
                position={direction === 'rtl' ? 'bottom-left' : 'bottom-right'}
            />
        </DirectionProvider>
    );
}
