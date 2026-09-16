import {
    ArrowDown01Icon,
    Logout01Icon,
    Settings01Icon,
    Shield01Icon,
    Tick02Icon,
    UserIcon,
} from '@hugeicons/core-free-icons';
import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { UserInfo } from '@/components/user-info';
import type { Appearance } from '@/hooks/use-appearance';
import { useAppearance } from '@/hooks/use-appearance';
import { useMobileNavigation } from '@/hooks/use-mobile-navigation';
import { cn } from '@/lib/utils';
import { logout } from '@/routes';
import { edit } from '@/routes/profile';
import { edit as editSecurity } from '@/routes/security';
import type { User } from '@/types';

const appearanceOptions: Appearance[] = ['light', 'system', 'dark'];

type Props = {
    user: User;
};

export function UserMenuContent({ user }: Props) {
    const cleanup = useMobileNavigation();
    const { appearance, updateAppearance } = useAppearance();
    const [appearanceOpen, setAppearanceOpen] = useState(false);
    const { t } = useTranslation();

    const handleLogout = () => {
        cleanup();
        router.flushAll();
    };

    return (
        <>
            <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-start text-sm">
                    <UserInfo user={user} showEmail={true} />
                </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={edit()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Icon iconNode={UserIcon} className="me-2" />
                        {t('navigation.profile')}
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem asChild>
                    <Link
                        className="block w-full cursor-pointer"
                        href={editSecurity()}
                        prefetch
                        onClick={cleanup}
                    >
                        <Icon iconNode={Shield01Icon} className="me-2" />
                        {t('navigation.security')}
                    </Link>
                </DropdownMenuItem>

                <DropdownMenuItem
                    className="cursor-pointer"
                    aria-expanded={appearanceOpen}
                    onSelect={(event) => {
                        event.preventDefault();
                        setAppearanceOpen((open) => !open);
                    }}
                >
                    <Icon iconNode={Settings01Icon} className="me-2" />
                    {t('navigation.appearance')}
                    <Icon
                        iconNode={ArrowDown01Icon}
                        className={cn(
                            'ms-auto size-4 shrink-0 opacity-60 transition-transform duration-200',
                            appearanceOpen && 'rotate-180',
                        )}
                    />
                </DropdownMenuItem>

                <div
                    className={cn(
                        'grid transition-[grid-template-rows] duration-200 ease-out',
                        appearanceOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
                    )}
                >
                    <div className="overflow-hidden">
                        {appearanceOpen &&
                            appearanceOptions.map((value) => (
                                <DropdownMenuItem
                                    key={value}
                                    className="cursor-pointer ps-8"
                                    onSelect={(event) => {
                                        event.preventDefault();
                                        updateAppearance(value);
                                    }}
                                >
                                    <span
                                        className={cn(
                                            appearance !== value &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        {t(`appearance.${value}`)}
                                    </span>
                                    {appearance === value && (
                                        <Icon
                                            iconNode={Tick02Icon}
                                            className="text-primary ms-auto size-4 shrink-0"
                                        />
                                    )}
                                </DropdownMenuItem>
                            ))}
                    </div>
                </div>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
                <Link
                    className="block w-full cursor-pointer"
                    href={logout()}
                    as="button"
                    onClick={handleLogout}
                    data-test="logout-button"
                >
                    <Icon iconNode={Logout01Icon} className="me-2" />
                    {t('navigation.log_out')}
                </Link>
            </DropdownMenuItem>
        </>
    );
}
