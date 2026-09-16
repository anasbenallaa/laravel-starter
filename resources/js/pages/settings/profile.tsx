import { Form, Head, Link, usePage } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import { LanguagePreference } from '@/components/language-preference';
import InputError from '@/components/input-error';
import ProfileAvatar from '@/components/profile-avatar';
import SettingsCard from '@/components/settings-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { Auth } from '@/types';

type PageProps = {
    auth: Auth;
};

export default function Profile({
    mustVerifyEmail,
    status,
}: {
    mustVerifyEmail: boolean;
    status?: string;
}) {
    const { auth } = usePage<PageProps>().props;
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('settings.profile.head')} />

            <h1 className="sr-only">{t('settings.profile.head')}</h1>

            <SettingsCard
                title={t('settings.profile.picture_title')}
                description={t('settings.profile.picture_description')}
            >
                <ProfileAvatar user={auth.user} />
            </SettingsCard>

            <Form
                {...ProfileController.update.form()}
                options={{ preserveScroll: true }}
            >
                {({ processing, errors }) => (
                    <SettingsCard
                        title={t('settings.profile.details_title')}
                        description={t('settings.profile.details_description')}
                        action={
                            <Button
                                variant="outline"
                                disabled={processing}
                                data-test="update-profile-button"
                            >
                                {t('common.save')}
                            </Button>
                        }
                    >
                        <div className="grid gap-6 sm:grid-cols-2">
                            <div className="grid gap-2">
                                <Label htmlFor="name">
                                    {t('fields.name')}{' '}
                                    <span className="text-primary">*</span>
                                </Label>

                                <Input
                                    id="name"
                                    className="block w-full"
                                    defaultValue={auth.user.name}
                                    name="name"
                                    required
                                    autoComplete="name"
                                    placeholder={t('placeholders.full_name')}
                                />

                                <InputError message={errors.name} />
                            </div>

                            <div className="grid gap-2">
                                <Label htmlFor="email">
                                    {t('fields.email')}{' '}
                                    <span className="text-primary">*</span>
                                </Label>

                                <Input
                                    id="email"
                                    type="email"
                                    className="block w-full"
                                    defaultValue={auth.user.email}
                                    name="email"
                                    required
                                    autoComplete="username"
                                    placeholder={t('fields.email_address')}
                                    dir="ltr"
                                />

                                <InputError message={errors.email} />
                            </div>
                        </div>

                        {mustVerifyEmail &&
                            auth.user.email_verified_at === null && (
                                <div className="mt-4">
                                    <p className="text-muted-foreground text-sm">
                                        {t('settings.profile.email_unverified')}{' '}
                                        <Link
                                            href={send()}
                                            as="button"
                                            className="text-foreground underline decoration-neutral-300 underline-offset-4 transition-colors duration-300 ease-out hover:decoration-current! dark:decoration-neutral-500"
                                        >
                                            {t(
                                                'settings.profile.resend_verification',
                                            )}
                                        </Link>
                                    </p>

                                    {status === 'verification-link-sent' && (
                                        <div className="mt-2 text-sm font-medium text-green-600">
                                            {t(
                                                'settings.profile.verification_sent',
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                    </SettingsCard>
                )}
            </Form>

            <LanguagePreference />

            <DeleteUser />
        </>
    );
}

Profile.layout = {
    breadcrumbs: [
        {
            title: 'settings.profile.head',
            href: edit(),
        },
    ],
};
