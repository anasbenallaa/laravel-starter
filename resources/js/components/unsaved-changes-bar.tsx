import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { cn } from '@/lib/utils';

type Props = {
    /** Show the bar, usually `form.isDirty`. */
    visible: boolean;
    /** Discard the changes, usually `form.reset()` + `form.clearErrors()`. */
    onReset: () => void;
    /**
     * Save handler. When omitted, the Save button submits the surrounding
     * <form> (or the form with id `form`), so the form's own onSubmit runs.
     */
    onSave?: () => void;
    /** Id of the form to submit when the bar is rendered outside it. */
    form?: string;
    processing?: boolean;
    message?: string;
    saveLabel?: string;
};

/**
 * Floating "unsaved changes" bar that replaces classic Save / Cancel buttons.
 *
 * Desktop: a pill at the bottom centre of the window (full page width).
 * Mobile: slides down over the page header.
 * Enter saves while the bar is visible (text inputs already submit natively).
 */
export function UnsavedChangesBar({
    visible,
    onReset,
    onSave,
    form,
    processing = false,
    message,
    saveLabel,
}: Props) {
    const { t } = useTranslation();
    const saveButton = useRef<HTMLButtonElement>(null);

    const save = () => {
        if (onSave) {
            onSave();

            return;
        }

        const target = form
            ? document.getElementById(form)
            : saveButton.current?.form;

        if (target instanceof HTMLFormElement) {
            target.requestSubmit();
        }
    };

    useEffect(() => {
        if (!visible || processing) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key !== 'Enter' ||
                event.defaultPrevented ||
                event.isComposing ||
                event.shiftKey ||
                event.altKey ||
                event.metaKey ||
                event.ctrlKey
            ) {
                return;
            }

            const target = event.target;

            // Inputs submit on their own; buttons, links and open overlays
            // keep their own Enter behaviour.
            if (
                target instanceof HTMLElement &&
                target.closest(
                    'input, textarea, select, button, a, [contenteditable="true"], [role="dialog"], [role="menu"], [role="listbox"]',
                )
            ) {
                return;
            }

            event.preventDefault();
            save();
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    });

    const buttonType = onSave ? 'button' : 'submit';
    const saveProps = {
        type: buttonType,
        form: onSave ? undefined : form,
        disabled: processing,
        onClick: onSave,
    } as const;

    return (
        <>
            {/* Desktop: floating pill, centred on the full page width. */}
            <div
                role="region"
                aria-label={t('unsaved.label')}
                aria-hidden={!visible}
                inert={!visible}
                data-state={visible ? 'visible' : 'hidden'}
                className={cn(
                    'bg-popover/95 text-popover-foreground fixed bottom-6 left-1/2 z-40 hidden -translate-x-1/2 items-center gap-5 rounded-xl border py-1.5 ps-4 pe-1.5 shadow-2xl backdrop-blur transition-[translate,opacity] duration-300 ease-out md:flex',
                    visible
                        ? 'translate-y-0 opacity-100'
                        : 'pointer-events-none translate-y-[calc(100%+1.5rem)] opacity-0',
                )}
            >
                <p className="text-sm font-medium whitespace-nowrap">
                    {message ?? t('unsaved.message')}
                </p>
                <div className="flex items-center gap-2">
                    <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={onReset}
                        disabled={processing}
                    >
                        {t('unsaved.reset')}
                    </Button>
                    <Button ref={saveButton} size="sm" {...saveProps}>
                        {processing && <Spinner />}
                        {saveLabel ?? t('common.save_changes')}
                        <kbd className="border-primary-foreground/30 bg-primary-foreground/10 hidden rounded border px-1.5 py-0.5 font-mono text-[10px] leading-none font-normal lg:inline">
                            {t('unsaved.enter_key')}
                        </kbd>
                    </Button>
                </div>
            </div>

            {/* Mobile: replaces the page header. */}
            <div
                role="region"
                aria-label={t('unsaved.label')}
                aria-hidden={!visible}
                inert={!visible}
                data-state={visible ? 'visible' : 'hidden'}
                className={cn(
                    'bg-background fixed inset-x-0 top-0 z-40 flex h-16 items-center justify-between gap-3 border-b px-4 shadow-sm transition-transform duration-300 ease-out md:hidden',
                    visible
                        ? 'translate-y-0'
                        : 'pointer-events-none -translate-y-full',
                )}
            >
                <p className="truncate text-sm font-medium">
                    {t('unsaved.label')}
                </p>
                <div className="flex shrink-0 items-center gap-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={onReset}
                        disabled={processing}
                    >
                        {t('unsaved.reset')}
                    </Button>
                    <Button size="sm" {...saveProps}>
                        {processing && <Spinner />}
                        {t('common.save')}
                    </Button>
                </div>
            </div>
        </>
    );
}
