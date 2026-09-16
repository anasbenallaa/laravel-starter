import {
    RefreshIcon,
    SquareLock02Icon,
    ViewIcon,
    ViewOffSlashIcon,
} from '@hugeicons/core-free-icons';
import { Form } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import AlertError from '@/components/alert-error';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { regenerateRecoveryCodes } from '@/routes/two-factor';

type Props = {
    recoveryCodesList: string[];
    fetchRecoveryCodes: () => Promise<void>;
    errors: string[];
};

export default function TwoFactorRecoveryCodes({
    recoveryCodesList,
    fetchRecoveryCodes,
    errors,
}: Props) {
    const [codesAreVisible, setCodesAreVisible] = useState<boolean>(false);
    const codesSectionRef = useRef<HTMLDivElement | null>(null);
    const { t } = useTranslation();
    const canRegenerateCodes = recoveryCodesList.length > 0 && codesAreVisible;

    const toggleCodesVisibility = useCallback(async () => {
        if (!codesAreVisible && !recoveryCodesList.length) {
            await fetchRecoveryCodes();
        }

        setCodesAreVisible(!codesAreVisible);

        if (!codesAreVisible) {
            setTimeout(() => {
                codesSectionRef.current?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'nearest',
                });
            });
        }
    }, [codesAreVisible, recoveryCodesList.length, fetchRecoveryCodes]);

    useEffect(() => {
        if (!recoveryCodesList.length) {
            void fetchRecoveryCodes();
        }
    }, [recoveryCodesList.length, fetchRecoveryCodes]);

    const recoveryCodeIcon = codesAreVisible ? ViewOffSlashIcon : ViewIcon;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex gap-3">
                    <Icon
                        iconNode={SquareLock02Icon}
                        className="size-4"
                        aria-hidden="true"
                    />
                    {t('settings.recovery_codes.title')}
                </CardTitle>
                <CardDescription>
                    {t('settings.recovery_codes.description')}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col gap-3 select-none sm:flex-row sm:items-center sm:justify-between">
                    <Button
                        onClick={toggleCodesVisibility}
                        className="w-fit"
                        aria-expanded={codesAreVisible}
                        aria-controls="recovery-codes-section"
                    >
                        <Icon
                            iconNode={recoveryCodeIcon}
                            className="size-4"
                            aria-hidden="true"
                        />
                        {codesAreVisible
                            ? t('settings.recovery_codes.hide')
                            : t('settings.recovery_codes.view')}
                    </Button>

                    {canRegenerateCodes && (
                        <Form
                            {...regenerateRecoveryCodes.form()}
                            options={{ preserveScroll: true }}
                            onSuccess={fetchRecoveryCodes}
                        >
                            {({ processing }) => (
                                <Button
                                    variant="secondary"
                                    type="submit"
                                    disabled={processing}
                                    aria-describedby="regenerate-warning"
                                >
                                    <Icon iconNode={RefreshIcon} />{' '}
                                    {t('settings.recovery_codes.regenerate')}
                                </Button>
                            )}
                        </Form>
                    )}
                </div>
                <div
                    id="recovery-codes-section"
                    className={`relative overflow-hidden transition-all duration-300 ${codesAreVisible ? 'h-auto opacity-100' : 'h-0 opacity-0'}`}
                    aria-hidden={!codesAreVisible}
                >
                    <div className="mt-3 space-y-3">
                        {errors?.length ? (
                            <AlertError errors={errors} />
                        ) : (
                            <>
                                <div
                                    ref={codesSectionRef}
                                    className="bg-muted grid gap-1 rounded-lg p-4 font-mono text-sm"
                                    role="list"
                                    aria-label={t(
                                        'settings.recovery_codes.list',
                                    )}
                                    dir="ltr"
                                >
                                    {recoveryCodesList.length ? (
                                        recoveryCodesList.map((code, index) => (
                                            <div
                                                key={index}
                                                role="listitem"
                                                className="select-text"
                                            >
                                                {code}
                                            </div>
                                        ))
                                    ) : (
                                        <div
                                            className="space-y-2"
                                            aria-label={t(
                                                'settings.recovery_codes.loading',
                                            )}
                                        >
                                            {Array.from(
                                                { length: 8 },
                                                (_, index) => (
                                                    <div
                                                        key={index}
                                                        className="bg-muted-foreground/20 h-4 animate-pulse rounded"
                                                        aria-hidden="true"
                                                    />
                                                ),
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div className="text-muted-foreground text-xs select-none">
                                    <p id="regenerate-warning">
                                        {t('settings.recovery_codes.warning')}
                                    </p>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
