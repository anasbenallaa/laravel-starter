import { Mail01Icon } from '@hugeicons/core-free-icons';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { FormSection } from '@/components/form-section';
import { Ltr } from '@/components/ltr';
import InputError from '@/components/input-error';
import PasswordInput from '@/components/password-input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UnsavedChangesBar } from '@/components/unsaved-changes-bar';
import { useAuthorization } from '@/hooks/use-authorization';
import { cn } from '@/lib/utils';
import type { AssignableRole } from '@/types';

type Props = {
    /** Wayfinder route definition the form submits to. */
    action: { url: string; method: 'post' | 'put' };
    /** Password rules for the create form's password fields. */
    passwordRules?: string;
    initial?: { name: string; email: string };
    /** Edit form: endpoint that emails the user a password reset link. */
    passwordResetUrl?: string;
    /** Role choices; only shown when creating a user. */
    roles?: AssignableRole[];
    submitLabel: string;
};

export function UserForm({
    action,
    passwordRules,
    initial,
    roles,
    submitLabel,
    passwordResetUrl,
}: Props) {
    const isEditing = initial !== undefined;
    const { can } = useAuthorization();
    const { t } = useTranslation();
    const [sendingReset, setSendingReset] = useState(false);
    const [resetError, setResetError] = useState<string>();
    const form = useForm({
        name: initial?.name ?? '',
        email: initial?.email ?? '',
        password: '',
        password_confirmation: '',
        roles: [] as string[],
    });

    const toggleRole = (name: string, checked: boolean) =>
        form.setData(
            'roles',
            checked
                ? [...form.data.roles, name].sort()
                : form.data.roles.filter((role) => role !== name),
        );

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        // Editing never sends passwords: users set their own via a reset link.
        form.transform((data) =>
            isEditing ? { name: data.name, email: data.email } : data,
        );
        form.submit(action.method, action.url, {
            preserveScroll: true,
            onError: () => form.reset('password', 'password_confirmation'),
        });
    };

    const sendPasswordReset = () => {
        if (!passwordResetUrl) {
            return;
        }

        router.post(
            passwordResetUrl,
            {},
            {
                preserveScroll: true,
                preserveState: true,
                onStart: () => {
                    setSendingReset(true);
                    setResetError(undefined);
                },
                onFinish: () => setSendingReset(false),
                onError: (errors) => setResetError(errors.password_reset),
            },
        );
    };

    return (
        <form onSubmit={submit} className="space-y-6 md:pb-24">
            <FormSection
                title={t('users.form.details_title')}
                description={t('users.form.details_description')}
                className="grid gap-4 md:grid-cols-2"
            >
                <div className="grid content-start gap-2">
                    <Label htmlFor="name">{t('fields.name')} *</Label>
                    <Input
                        id="name"
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        autoComplete="off"
                        required
                        autoFocus
                    />
                    <InputError message={form.errors.name} />
                </div>
                <div className="grid content-start gap-2">
                    <Label htmlFor="email">{t('fields.email_address')} *</Label>
                    <Input
                        id="email"
                        type="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                        autoComplete="off"
                        dir="ltr"
                        required
                    />
                    <InputError message={form.errors.email} />
                </div>
            </FormSection>

            {isEditing ? (
                <FormSection
                    title={t('fields.password')}
                    description={t('users.form.password_reset_description')}
                    className="space-y-2"
                >
                    {passwordResetUrl && can('users.reset_password') ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={sendPasswordReset}
                                disabled={sendingReset}
                            >
                                <Icon iconNode={Mail01Icon} />
                                {sendingReset
                                    ? t('users.form.sending_reset')
                                    : t('users.form.send_reset')}
                            </Button>
                            <p className="text-muted-foreground text-xs">
                                {t('users.form.reset_link_help_before')}
                                <Ltr>{initial.email}</Ltr>
                                {t('users.form.reset_link_help_after')}
                            </p>
                            <InputError message={resetError} />
                        </>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            {t('users.form.reset_not_allowed')}
                        </p>
                    )}
                </FormSection>
            ) : (
                <FormSection
                    title={t('fields.password')}
                    description={t('users.form.password_description')}
                    className="grid gap-4 md:grid-cols-2"
                >
                    <div className="grid content-start gap-2">
                        <Label htmlFor="password">
                            {t('fields.password')} *
                        </Label>
                        <PasswordInput
                            id="password"
                            value={form.data.password}
                            onChange={(event) =>
                                form.setData('password', event.target.value)
                            }
                            autoComplete="new-password"
                            passwordrules={passwordRules}
                            required
                        />
                        <InputError message={form.errors.password} />
                    </div>
                    <div className="grid content-start gap-2">
                        <Label htmlFor="password_confirmation">
                            {t('fields.password_confirmation')} *
                        </Label>
                        <PasswordInput
                            id="password_confirmation"
                            value={form.data.password_confirmation}
                            onChange={(event) =>
                                form.setData(
                                    'password_confirmation',
                                    event.target.value,
                                )
                            }
                            autoComplete="new-password"
                            passwordrules={passwordRules}
                            required
                        />
                        <InputError
                            message={form.errors.password_confirmation}
                        />
                    </div>
                </FormSection>
            )}

            {roles && (
                <FormSection
                    title={t('users.form.roles_title')}
                    description={t('users.form.roles_description')}
                    className="space-y-3"
                >
                    {roles.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            {t('roles.empty')}
                        </p>
                    ) : (
                        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                            {roles.map((role) => {
                                const id = `role-${role.id}`;
                                const checked = form.data.roles.includes(
                                    role.name,
                                );

                                return (
                                    <label
                                        key={role.id}
                                        htmlFor={id}
                                        className={cn(
                                            'flex items-start gap-3 rounded-lg border p-3',
                                            role.assignable
                                                ? 'hover:bg-accent/40 cursor-pointer'
                                                : 'cursor-not-allowed opacity-70',
                                            checked && 'border-primary/40',
                                        )}
                                    >
                                        <Checkbox
                                            id={id}
                                            checked={checked}
                                            disabled={!role.assignable}
                                            onCheckedChange={(value) =>
                                                toggleRole(
                                                    role.name,
                                                    value === true,
                                                )
                                            }
                                            className="mt-0.5"
                                        />
                                        <span className="min-w-0 flex-1 space-y-1">
                                            <span className="flex flex-wrap items-center gap-2 text-sm font-medium">
                                                {role.name}
                                                {role.is_system && (
                                                    <SystemRoleBadge />
                                                )}
                                            </span>
                                            <span className="text-muted-foreground block text-xs">
                                                {role.is_system
                                                    ? t('roles.full_access')
                                                    : t('permissions.count', {
                                                          count: role
                                                              .permissions
                                                              .length,
                                                      })}
                                                {!role.assignable &&
                                                    ` · ${
                                                        role.is_system
                                                            ? t(
                                                                  'roles.only_admin_can_assign',
                                                              )
                                                            : t(
                                                                  'roles.includes_missing_permissions',
                                                              )
                                                    }`}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                    )}
                    <InputError message={form.errors.roles} />
                </FormSection>
            )}

            <UnsavedChangesBar
                visible={form.isDirty}
                processing={form.processing}
                saveLabel={submitLabel}
                onReset={() => {
                    form.reset();
                    form.clearErrors();
                }}
            />
        </form>
    );
}
