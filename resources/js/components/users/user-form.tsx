import { Mail01Icon } from '@hugeicons/core-free-icons';
import { router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { FormSection } from '@/components/form-section';
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
                title="User details"
                description="The name and email address used to sign in."
                className="grid gap-4 md:grid-cols-2"
            >
                <div className="grid content-start gap-2">
                    <Label htmlFor="name">Name *</Label>
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
                    <Label htmlFor="email">Email address *</Label>
                    <Input
                        id="email"
                        type="email"
                        value={form.data.email}
                        onChange={(event) =>
                            form.setData('email', event.target.value)
                        }
                        autoComplete="off"
                        required
                    />
                    <InputError message={form.errors.email} />
                </div>
            </FormSection>

            {isEditing ? (
                <FormSection
                    title="Password"
                    description="Passwords are never set by administrators. Send the user an email with a secure link to choose a new password."
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
                                    ? 'Sending…'
                                    : 'Send password reset link'}
                            </Button>
                            <p className="text-muted-foreground text-xs">
                                The link is sent to {initial.email} and expires
                                after a limited time.
                            </p>
                            <InputError message={resetError} />
                        </>
                    ) : (
                        <p className="text-muted-foreground text-sm">
                            You don't have permission to send password reset
                            links.
                        </p>
                    )}
                </FormSection>
            ) : (
                <FormSection
                    title="Password"
                    description="Share it with the user securely; they can change it in their security settings."
                    className="grid gap-4 md:grid-cols-2"
                >
                    <div className="grid content-start gap-2">
                        <Label htmlFor="password">Password *</Label>
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
                            Confirm password *
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
                    title="Roles"
                    description="Optional. The user inherits every permission of each selected role."
                    className="space-y-3"
                >
                    {roles.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            There are no roles yet.
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
                                                    ? 'Full access to everything'
                                                    : `${role.permissions.length} ${role.permissions.length === 1 ? 'permission' : 'permissions'}`}
                                                {!role.assignable &&
                                                    (role.is_system
                                                        ? ' · Only an administrator can assign this'
                                                        : ' · Includes permissions you do not have')}
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
