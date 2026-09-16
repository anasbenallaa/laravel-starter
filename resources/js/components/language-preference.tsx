import { Tick02Icon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import SettingsCard from '@/components/settings-card';
import { Icon } from '@/components/ui/icon';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

/**
 * Settings card to choose the interface language. Applied immediately (like
 * appearance), saved to the account and used for emails and notifications.
 */
export function LanguagePreference() {
    const { t } = useTranslation();
    const { locale, supportedLocales, setLocale } = useLocale();

    return (
        <SettingsCard
            title={t('settings.language.title')}
            description={t('settings.language.description')}
        >
            <div
                role="radiogroup"
                aria-label={t('language.label')}
                className="grid gap-3 sm:grid-cols-3"
            >
                {supportedLocales.map((option) => {
                    const selected = option.code === locale;
                    const translatedName = t(`language.name.${option.code}`);

                    return (
                        <button
                            key={option.code}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => {
                                if (!selected) {
                                    void setLocale(option.code);
                                }
                            }}
                            data-test={`locale-option-${option.code}`}
                            className={cn(
                                'hover:bg-muted/60 focus-visible:ring-ring flex items-center justify-between gap-3 rounded-lg border px-4 py-3 text-start transition-colors focus-visible:ring-[3px] focus-visible:outline-none',
                                selected && 'border-primary bg-primary/5',
                            )}
                        >
                            <span className="min-w-0">
                                <span
                                    lang={option.code}
                                    dir={option.direction}
                                    className="block truncate text-sm font-medium"
                                >
                                    {option.nativeName}
                                </span>
                                {translatedName !== option.nativeName && (
                                    <span className="text-muted-foreground block truncate text-xs">
                                        {translatedName}
                                    </span>
                                )}
                            </span>
                            {selected && (
                                <Icon
                                    iconNode={Tick02Icon}
                                    className="text-primary size-4 shrink-0"
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </SettingsCard>
    );
}
