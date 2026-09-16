import { Head, useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import UserAccessController from '@/actions/App/Http/Controllers/Admin/UserAccessController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { PermissionGroups } from '@/components/authorization/permission-groups';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import InputError from '@/components/input-error';
import { Ltr } from '@/components/ltr';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { UnsavedChangesBar } from '@/components/unsaved-changes-bar';
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
    const { t } = useTranslation();
    // Sorted, so toggling a value back matches the defaults again (isDirty).
    const form = useForm({
        roles: [...assigned.roles].sort(),
        permissions: [...assigned.permissions].sort(),
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
            // The page stays open, so the saved values become the new baseline.
            onSuccess: () => form.setDefaults(),
        });
    };

    return (
        <>
            <Head title={t('users.access.head', { name: user.name })} />

            <form
                onSubmit={submit}
                className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6 md:pb-28"
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
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('users.form.roles_title')}</CardTitle>
                        <CardDescription>
                            {t('users.access.roles_description')}
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
                                                    ? t('roles.full_access')
                                                    : t('permissions.count', {
                                                          count: role
                                                              .permissions
                                                              .length,
                                                      })}
                                                {lockedAdmin &&
                                                    ` · ${t('roles.last_admin')}`}
                                                {!role.assignable &&
                                                    ` · ${
                                                        role.is_system
                                                            ? t(
                                                                  'roles.only_admin_can_change',
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
                        <InputError message={form.errors.roles} />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>{t('users.access.direct_title')}</CardTitle>
                        <CardDescription>
                            {t('users.access.direct_description')}
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
                        <CardTitle>
                            {t('users.access.effective_title')}
                        </CardTitle>
                        <CardDescription>
                            {t('users.access.effective_description')}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {isAdmin ? (
                            <p className="text-sm">
                                <span className="font-medium">
                                    {t('users.access.all_permissions')}
                                </span>{' '}
                                <span className="text-muted-foreground">
                                    {t('users.access.admin_passes')}
                                </span>
                            </p>
                        ) : effectivePermissions.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                {t('users.access.no_permissions')}
                            </p>
                        ) : (
                            <ul className="flex flex-wrap gap-1.5">
                                {effectivePermissions.map((permission) => (
                                    <li
                                        key={permission}
                                        className="bg-muted flex items-center gap-1.5 rounded-md px-2 py-1 font-mono text-xs"
                                    >
                                        <Ltr>{permission}</Ltr>
                                        <span className="text-muted-foreground font-sans text-[10px]">
                                            {inheritedPermissions.has(
                                                permission,
                                            )
                                                ? t('users.access.source_role')
                                                : t(
                                                      'users.access.source_direct',
                                                  )}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </CardContent>
                </Card>
                <UnsavedChangesBar
                    visible={form.isDirty}
                    processing={form.processing}
                    saveLabel={t('users.access.save')}
                    onReset={() => {
                        form.reset();
                        form.clearErrors();
                    }}
                />
            </form>
        </>
    );
}

UserAccess.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'navigation.users', href: UserController.index() },
        {
            title: props.user.name,
            href: UserAccessController.edit(props.user.id),
            literal: true,
        },
    ],
});
