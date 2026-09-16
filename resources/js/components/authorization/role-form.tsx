import { Link, useForm } from '@inertiajs/react';
import { PermissionGroups } from '@/components/authorization/permission-groups';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isDelegable } from '@/lib/permissions';
import type { DelegablePermissions, PermissionGroup } from '@/types';

type Props = {
    /** Wayfinder route definition the form submits to. */
    action?: { url: string; method: 'post' | 'put' };
    cancelHref: string;
    permissionGroups: PermissionGroup[];
    delegablePermissions: DelegablePermissions;
    initialName?: string;
    initialPermissions?: string[];
    submitLabel?: string;
    /** Show everything disabled with no save button. */
    readOnly?: boolean;
    isSystem?: boolean;
    /** Explanation shown under the name when the form is read-only. */
    notice?: string;
};

export function RoleForm({
    action,
    cancelHref,
    permissionGroups,
    delegablePermissions,
    initialName = '',
    initialPermissions = [],
    submitLabel = 'Save',
    readOnly = false,
    isSystem = false,
    notice,
}: Props) {
    const form = useForm<{
        name: string;
        permissions: string[];
        role?: string;
    }>({
        name: initialName,
        permissions: initialPermissions,
    });

    const allNames = permissionGroups.flatMap((group) =>
        group.permissions.map((permission) => permission.name),
    );
    const grantable = readOnly
        ? []
        : allNames.filter((name) => isDelegable(name, delegablePermissions));

    const setAll = (checked: boolean) => {
        const kept = form.data.permissions.filter(
            (name) => !grantable.includes(name),
        );

        form.setData(
            'permissions',
            checked ? [...new Set([...kept, ...grantable])].sort() : kept,
        );
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (action && !readOnly) {
            form.submit(action.method, action.url, { preserveScroll: true });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6">
            {form.errors.role && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {form.errors.role}
                </div>
            )}

            <FormSection
                title="Role details"
                description="How this role appears to people who manage access."
            >
                <div className="grid gap-2 md:max-w-xl">
                    <Label htmlFor="name">Role name{!readOnly && ' *'}</Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            placeholder="e.g. Manager"
                            autoComplete="off"
                            maxLength={100}
                            required
                            autoFocus={!readOnly}
                            disabled={readOnly}
                        />
                        {isSystem && <SystemRoleBadge />}
                    </div>
                    {notice && (
                        <p className="text-muted-foreground text-xs">
                            {notice}
                        </p>
                    )}
                    <InputError message={form.errors.name} />
                </div>
            </FormSection>

            <FormSection
                title="Permissions"
                description="A role is a set of permissions. Its members inherit everything selected here."
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold tabular-nums">
                            {form.data.permissions.length} / {allNames.length}{' '}
                            permissions selected
                            {!readOnly && delegablePermissions !== null && (
                                <span className="text-muted-foreground font-normal">
                                    {' '}
                                    · You can only grant permissions you have.
                                </span>
                            )}
                        </p>
                        {!readOnly && (
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAll(true)}
                                    disabled={grantable.length === 0}
                                >
                                    Select all
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setAll(false)}
                                >
                                    Deselect all
                                </Button>
                            </div>
                        )}
                    </div>

                    <PermissionGroups
                        groups={permissionGroups}
                        selected={form.data.permissions}
                        onChange={(permissions) =>
                            form.setData('permissions', permissions)
                        }
                        delegable={delegablePermissions}
                        readOnly={readOnly}
                    />
                    <InputError message={form.errors.permissions} />
                </div>
            </FormSection>

            {!readOnly && (
                <div className="flex gap-2">
                    <Button type="submit" disabled={form.processing}>
                        {submitLabel}
                    </Button>
                    <Button variant="ghost" asChild>
                        <Link href={cancelHref}>Cancel</Link>
                    </Button>
                </div>
            )}
        </form>
    );
}
