import { Form, Head } from '@inertiajs/react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import SecurityController from '@/actions/App/Http/Controllers/Settings/SecurityController';
import InputError from '@/components/input-error';
import type { Props as ManagePasskeysProps } from '@/components/manage-passkeys';
import ManagePasskeys from '@/components/manage-passkeys';
import type { Props as ManageTwoFactorProps } from '@/components/manage-two-factor';
import ManageTwoFactor from '@/components/manage-two-factor';
import PasswordInput from '@/components/password-input';
import SettingsCard from '@/components/settings-card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/security';

// oxfmt-ignore
type Props = {
    passwordRules: string;
} & ManagePasskeysProps &
    ManageTwoFactorProps;

export default function Security(props: Props) {
    const passwordInput = useRef<HTMLInputElement>(null);
    const currentPasswordInput = useRef<HTMLInputElement>(null);
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('settings.security.head')} />

            <h1 className="sr-only">{t('settings.security.head')}</h1>

            <Form
                {...SecurityController.update.form()}
                options={{ preserveScroll: true }}
                resetOnError={[
                    'password',
                    'password_confirmation',
                    'current_password',
                ]}
                resetOnSuccess
                onError={(errors) => {
                    if (errors.password) {
                        passwordInput.current?.focus();
                    }

                    if (errors.current_password) {
                        currentPasswordInput.current?.focus();
                    }
                }}
            >
                {({ errors, processing }) => (
                    <SettingsCard
                        title={t('settings.password.title')}
                        description={t('settings.password.description')}
                        action={
                            <Button
                                variant="outline"
                                disabled={processing}
                                data-test="update-password-button"
                            >
                                {t('common.save')}
                            </Button>
                        }
                    >
                        <div className="space-y-6">
                            <div className="grid gap-6 sm:grid-cols-2">
                                <div className="grid gap-2">
                                    <Label htmlFor="current_password">
                                        {t('fields.current_password')}{' '}
                                        <span className="text-primary">*</span>
                                    </Label>

                                    <PasswordInput
                                        id="current_password"
                                        ref={currentPasswordInput}
                                        name="current_password"
                                        className="block w-full"
                                        autoComplete="current-password"
                                        placeholder={t(
                                            'fields.current_password',
                                        )}
                                    />

                                    <InputError
                                        message={errors.current_password}
                                    />
                                </div>

                                <div className="grid gap-2">
                                    <Label htmlFor="password">
                                        {t('fields.new_password')}{' '}
                                        <span className="text-primary">*</span>
                                    </Label>

                                    <PasswordInput
                                        id="password"
                                        ref={passwordInput}
                                        name="password"
                                        className="block w-full"
                                        autoComplete="new-password"
                                        placeholder={t('fields.new_password')}
                                        passwordrules={props.passwordRules}
                                    />

                                    <InputError message={errors.password} />
                                </div>
                            </div>

                            <div className="grid gap-2 sm:max-w-[calc(50%-0.75rem)]">
                                <Label htmlFor="password_confirmation">
                                    {t('fields.password_confirmation')}{' '}
                                    <span className="text-primary">*</span>
                                </Label>

                                <PasswordInput
                                    id="password_confirmation"
                                    name="password_confirmation"
                                    className="block w-full"
                                    autoComplete="new-password"
                                    placeholder={t(
                                        'fields.password_confirmation',
                                    )}
                                    passwordrules={props.passwordRules}
                                />

                                <InputError
                                    message={errors.password_confirmation}
                                />
                            </div>
                        </div>
                    </SettingsCard>
                )}
            </Form>

            <ManageTwoFactor
                canManageTwoFactor={props.canManageTwoFactor}
                requiresConfirmation={props.requiresConfirmation}
                twoFactorEnabled={props.twoFactorEnabled}
            />

            <ManagePasskeys
                canManagePasskeys={props.canManagePasskeys}
                passkeys={props.passkeys}
            />
        </>
    );
}

Security.layout = {
    breadcrumbs: [
        {
            title: 'settings.security.head',
            href: edit(),
        },
    ],
};
