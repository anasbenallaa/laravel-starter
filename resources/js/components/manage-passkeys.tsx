import { Key01Icon } from '@hugeicons/core-free-icons';
import { router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { destroy } from '@/actions/Laravel/Passkeys/Http/Controllers/PasskeyRegistrationController';
import PasskeyItem from '@/components/passkey-item';
import PasskeyRegistration from '@/components/passkey-register';
import { Icon } from '@/components/ui/icon';
import SettingsCard from '@/components/settings-card';
import type { Passkey } from '@/types/auth';

export type Props = {
    canManagePasskeys?: boolean;
    passkeys?: Passkey[];
};

const EmptyState = () => {
    const { t } = useTranslation();

    return (
        <div className="border-border/70 flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
            <div className="bg-muted mb-2 flex size-12 items-center justify-center rounded-2xl">
                <Icon
                    iconNode={Key01Icon}
                    className="text-muted-foreground size-6"
                />
            </div>
            <p className="text-base font-semibold">
                {t('settings.passkeys.empty_title')}
            </p>
            <p className="text-muted-foreground text-sm">
                {t('settings.passkeys.empty_description')}
            </p>
        </div>
    );
};

export default function ManagePasskeys(props: Props) {
    const passkeys = props.passkeys ?? [];
    const { t } = useTranslation();

    const handleDelete = (id: number, onError: () => void) => {
        router.delete(destroy.url(id), {
            preserveScroll: true,
            onError,
        });
    };

    const handleRegisterSuccess = () => {
        router.reload();
    };

    if (!(props.canManagePasskeys ?? false)) {
        return null;
    }

    return (
        <SettingsCard
            title={t('settings.passkeys.title')}
            description={t('settings.passkeys.description')}
        >
            <div className="space-y-6">
                {passkeys.length > 0 ? (
                    <div className="border-border/70 overflow-hidden rounded-lg border">
                        {passkeys.map((passkey) => (
                            <PasskeyItem
                                key={passkey.id}
                                passkey={passkey}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : (
                    <EmptyState />
                )}

                <PasskeyRegistration onSuccess={handleRegisterSuccess} />
            </div>
        </SettingsCard>
    );
}
