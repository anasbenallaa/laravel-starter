import { LanguageSkillIcon, Tick02Icon } from '@hugeicons/core-free-icons';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { useLocale } from '@/hooks/use-locale';
import { cn } from '@/lib/utils';

/**
 * Language menu for the header and auth pages. Saves the choice (session, and
 * the user's account when signed in) and re-renders in the new language and
 * direction without a reload.
 */
export function LanguageSwitcher({ className }: { className?: string }) {
    const { t } = useTranslation();
    const { locale, supportedLocales, setLocale } = useLocale();
    const current = supportedLocales.find((option) => option.code === locale);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className={cn('h-8 gap-1.5 px-2', className)}
                    aria-label={t('language.change')}
                    data-test="language-switcher"
                >
                    <Icon iconNode={LanguageSkillIcon} className="size-5" />
                    <span className="text-xs font-semibold uppercase">
                        {current?.code}
                    </span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-44">
                <DropdownMenuLabel className="text-muted-foreground text-xs">
                    {t('language.label')}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {supportedLocales.map((option) => (
                    <DropdownMenuItem
                        key={option.code}
                        lang={option.code}
                        dir={option.direction}
                        className="justify-between gap-3"
                        onSelect={() => {
                            if (option.code !== locale) {
                                void setLocale(option.code);
                            }
                        }}
                    >
                        <span>{option.nativeName}</span>
                        {option.code === locale && (
                            <Icon
                                iconNode={Tick02Icon}
                                className="text-primary size-4"
                            />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
