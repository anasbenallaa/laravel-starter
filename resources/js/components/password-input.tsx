import { ViewIcon, ViewOffSlashIcon } from '@hugeicons/core-free-icons';
import type { ComponentProps, Ref } from 'react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export default function PasswordInput({
    className,
    ref,
    ...props
}: Omit<ComponentProps<'input'>, 'type'> & { ref?: Ref<HTMLInputElement> }) {
    const [showPassword, setShowPassword] = useState(false);
    const { t } = useTranslation();

    return (
        <div className="relative">
            <Input
                type={showPassword ? 'text' : 'password'}
                className={cn('pe-10', className)}
                ref={ref}
                {...props}
            />
            <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 end-0 flex items-center rounded-e-md px-3 focus-visible:ring-[3px] focus-visible:outline-none"
                aria-label={
                    showPassword
                        ? t('fields.hide_password')
                        : t('fields.show_password')
                }
                tabIndex={-1}
            >
                {showPassword ? (
                    <Icon iconNode={ViewOffSlashIcon} className="size-4" />
                ) : (
                    <Icon iconNode={ViewIcon} className="size-4" />
                )}
            </button>
        </div>
    );
}
