// Components
import { Loading03Icon } from '@hugeicons/core-free-icons';
import { Form, Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import InputError from '@/components/input-error';
import TextLink from '@/components/text-link';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { login } from '@/routes';
import { email } from '@/routes/password';

export default function ForgotPassword({ status }: { status?: string }) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('auth.forgot_password.head')} />

            {status && (
                <div className="mb-4 text-center text-sm font-medium text-green-600">
                    {status}
                </div>
            )}

            <div className="space-y-6">
                <Form {...email.form()}>
                    {({ processing, errors }) => (
                        <>
                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    {t('fields.email_address')}
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    name="email"
                                    autoComplete="off"
                                    autoFocus
                                    placeholder={t('placeholders.email')}
                                    dir="ltr"
                                />

                                <InputError message={errors.email} />
                            </div>

                            <div className="my-6 flex items-center justify-start">
                                <Button
                                    className="w-full"
                                    disabled={processing}
                                    data-test="email-password-reset-link-button"
                                >
                                    {processing && (
                                        <Icon
                                            iconNode={Loading03Icon}
                                            className="h-4 w-4 animate-spin"
                                        />
                                    )}
                                    {t('auth.forgot_password.submit')}
                                </Button>
                            </div>
                        </>
                    )}
                </Form>

                <div className="text-muted-foreground text-center text-sm">
                    {t('auth.forgot_password.return_to')}{' '}
                    <TextLink href={login()}>
                        {t('auth.forgot_password.log_in_link')}
                    </TextLink>
                </div>
            </div>
        </>
    );
}

ForgotPassword.layout = {
    title: 'auth.forgot_password.title',
    description: 'auth.forgot_password.description',
};
