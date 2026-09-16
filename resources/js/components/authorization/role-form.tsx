import { Link, useForm } from '@inertiajs/react';
import { PermissionGroups } from '@/components/authorization/permission-groups';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { isDelegable } from '@/lib/permissions';
import type { DelegablePermissions, PermissionGroup } from '@/types';

type Props = {
    /** Wayfinder route definition the form submits to. */
    action: { url: string; method: 'post' | 'put' };
    cancelHref: string;
    permissionGroups: PermissionGroup[];
    delegablePermissions: DelegablePermissions;
    initialName?: string;
    initialPermissions?: string[];
    submitLabel: string;
};

export function RoleForm({
    action,
    cancelHref,
    permissionGroups,
    delegablePermissions,
    initialName = '',
    initialPermissions = [],
    submitLabel,
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
    const grantable = allNames.filter((name) =>
        isDelegable(name, delegablePermissions),
    );

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
        form.submit(action.method, action.url, { preserveScroll: true });
    };

    return (
        <form onSubmit={submit} className="space-y-8">
            {form.errors.role && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {form.errors.role}
                </div>
            )}

            <div className="grid max-w-md gap-2">
                <Label htmlFor="name">Role name</Label>
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
                    autoFocus
                />
                <InputError message={form.errors.name} />
            </div>

            <div className="space-y-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h2 className="text-base font-semibold">Permissions</h2>
                        <p className="text-muted-foreground text-sm">
                            {form.data.permissions.length} of {allNames.length}{' '}
                            selected
                            {delegablePermissions !== null &&
                                '. You can only grant permissions you have.'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAll(true)}
                            disabled={grantable.length === 0}
                        >
                            Select all
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setAll(false)}
                        >
                            Clear all
                        </Button>
                    </div>
                </div>

                <PermissionGroups
                    groups={permissionGroups}
                    selected={form.data.permissions}
                    onChange={(permissions) =>
                        form.setData('permissions', permissions)
                    }
                    delegable={delegablePermissions}
                />
                <InputError message={form.errors.permissions} />
            </div>

            <div className="flex gap-2 border-t pt-6">
                <Button type="submit" disabled={form.processing}>
                    {submitLabel}
                </Button>
                <Button variant="ghost" asChild>
                    <Link href={cancelHref}>Cancel</Link>
                </Button>
            </div>
        </form>
    );
}
