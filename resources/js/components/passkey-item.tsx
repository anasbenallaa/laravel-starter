import { Delete02Icon, Key01Icon } from '@hugeicons/core-free-icons';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import type { Passkey } from '@/types/auth';

type Props = {
    passkey: Passkey;
    onDelete: (id: number, onError: () => void) => void;
};

export default function PasskeyItem({ passkey, onDelete }: Props) {
    const [isDeleting, setIsDeleting] = useState(false);
    const { t } = useTranslation();

    const handleDelete = () => {
        setIsDeleting(true);
        onDelete(passkey.id, () => setIsDeleting(false));
    };

    return (
        <div className="flex items-center justify-between border-b p-4 last:border-b-0">
            <div className="flex items-center gap-4">
                <div className="bg-muted flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
                    <Icon
                        iconNode={Key01Icon}
                        className="text-muted-foreground h-5 w-5"
                    />
                </div>
                <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                        <p className="font-medium tracking-tight">
                            {passkey.name}
                        </p>
                        {passkey.authenticator && (
                            <span className="bg-muted text-muted-foreground ring-border inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide uppercase ring-1 ring-inset">
                                {passkey.authenticator}
                            </span>
                        )}
                    </div>
                    <p className="text-muted-foreground text-sm">
                        {t('settings.passkeys.added', {
                            time: passkey.created_at_diff,
                        })}
                        {passkey.last_used_at_diff && (
                            <>
                                <span className="text-muted-foreground/50 mx-1">
                                    /
                                </span>
                                {t('settings.passkeys.last_used', {
                                    time: passkey.last_used_at_diff,
                                })}
                            </>
                        )}
                    </p>
                </div>
            </div>

            <Dialog>
                <DialogTrigger asChild>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                        <Icon iconNode={Delete02Icon} className="h-4 w-4" />
                        <span className="sr-only">{t('common.remove')}</span>
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogTitle>{t('settings.passkeys.remove')}</DialogTitle>
                    <DialogDescription>
                        {t('settings.passkeys.remove_confirm', {
                            name: passkey.name,
                        })}
                    </DialogDescription>
                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button variant="secondary">
                                {t('common.cancel')}
                            </Button>
                        </DialogClose>
                        <Button
                            variant="destructive"
                            onClick={handleDelete}
                            disabled={isDeleting}
                        >
                            {isDeleting
                                ? t('settings.passkeys.removing')
                                : t('settings.passkeys.remove')}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
