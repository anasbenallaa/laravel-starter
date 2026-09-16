import { Head, Link, useForm } from '@inertiajs/react';
import UserAccessController from '@/actions/App/Http/Controllers/Admin/UserAccessController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { PermissionGroups } from '@/components/authorization/permission-groups';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UserInfo } from '@/components/user-info';
import { ADMIN_ROLE } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type {
    AssignableRole,
    DelegablePermissions,
    PermissionGroup,
    User,
} from '@/types';

type Props = {
    user: { id: number; name: string; email: string; avatar: string | null };
    roles: AssignableRole[];
    permissionGroups: PermissionGroup[];
    assigned: { roles: string[]; permissions: string[] };
    effectivePermissions: string[];
    delegablePermissions: DelegablePermissions;
    isLastAdmin: boolean;
};

export default function UserAccess({
    user,
    roles,
    permissionGroups,
    assigned,
    delegablePermissions,
    isLastAdmin,
}: Props) {
    const form = useForm({
        roles: assigned.roles,
        permissions: assigned.permissions,
    });

    const selectedRoles = roles.filter((role) =>
        form.data.roles.includes(role.name),
    );
    const isAdmin = form.data.roles.includes(ADMIN_ROLE);
    const inheritedPermissions = new Set(
        selectedRoles.flatMap((role) => role.permissions),
    );
    // Recomputed from the current selection, so the preview updates live.
    const effectivePermissions = [
        ...new Set([...inheritedPermissions, ...form.data.permissions]),
    ].sort();

    const toggleRole = (name: string, checked: boolean) =>
        form.setData(
            'roles',
            checked
                ? [...form.data.roles, name].sort()
                : form.data.roles.filter((role) => role !== name),
        );

    const submit = (event: React.FormEvent) => {
        event.preventDefault();
        form.put(UserAccessController.update.url(user.id), {
            preserveScroll: true,
        });
    };

    return (
        <>
            <Head title={`Manage access · ${user.name}`} />

            <form
                onSubmit={submit}
                className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6"
            >
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <UserInfo
                            user={
                                {
                                    ...user,
                                    avatar: user.avatar ?? undefined,
                                } as unknown as User
                            }
                            showEmail
                            avatarClassName="size-11"
                        />
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" asChild>
                            <Link href={UserController.index.url()}>
                                Cancel
                            </Link>
                        </Button>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.isDirty}
                        >
                            Save access
                        </Button>
                    </div>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Roles</CardTitle>
                        <CardDescription>
                            The user inherits every permission of each assigned
                            role.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="grid gap-2 sm:grid-cols-2">
                            {roles.map((role) => {
                                const checked = form.data.roles.includes(
                                    role.name,
                                );
                                const lockedAdmin =
                                    role.is_system && checked && isLastAdmin;
                                const disabled =
                                    !role.assignable || lockedAdmin;
                                const id = `role-${role.id}`;

                                return (
                                    <label
                                        key={role.id}
                                        htmlFor={id}
                                        className={cn(
                                            'flex items-start gap-3 rounded-lg border p-3',
                                            disabled
                                                ? 'cursor-not-allowed opacity-70'
                                                : 'hover:bg-accent/40 cursor-pointer',
                                            checked && 'border-primary/40',
                                        )}
                                    >
                                        <Checkbox
                                            id={id}
                                            checked={checked}
                                            disabled={disabled}
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
                                                {lockedAdmin &&
                                                    ' · Last administrator'}
                                                {!role.assignable &&
                                                    (role.is_system
                                                        ? ' · Only an administrator can change this'
                                                        : ' · Includes permissions you do not have')}
                                            </span>
                                        </span>
                                    </label>
                                );
                            })}
                        </div>
                        <InputError message={form.errors.roles} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Direct permissions</CardTitle>
                        <CardDescription>
                            Granted to this user individually, in addition to
                            their roles. Permissions inherited from roles are
                            not listed here.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <PermissionGroups
                            groups={permissionGroups}
                            selected={form.data.permissions}
                            onChange={(permissions) =>
                                form.setData('permissions', permissions)
                            }
                            delegable={delegablePermissions}
                            idPrefix="direct"
                        />
                        <InputError message={form.errors.permissions} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Effective permissions</CardTitle>
                        <CardDescription>
                            Everything this user can do with the selection
                            above: role permissions plus direct permissions.
                            Read-only.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAdmin ? (
                            <p className="text-sm">
                                <span className="font-medium">
                                    All permissions.
                                </span>{' '}
                                <span className="text-muted-foreground">
                                    Administrators pass every permission check.
                                </span>
                            </p>
                        ) : effectivePermissions.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                This user has no permissions.
                            </p>
                        ) : (
                            <ul className="flex flex-wrap gap-1.5">
                                {effectivePermissions.map((permission) => (
                                    <li
                                        key={permission}
                                        className="bg-muted flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs"
                                    >
                                        {permission}
                                        <span className="text-muted-foreground font-sans text-[10px]">
                                            {inheritedPermissions.has(
                                                permission,
                                            )
                                                ? 'role'
                                                : 'direct'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
            </form>
        </>
    );
}

UserAccess.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Users', href: UserController.index() },
        {
            title: props.user.name,
            href: UserAccessController.edit(props.user.id),
        },
    ],
});
