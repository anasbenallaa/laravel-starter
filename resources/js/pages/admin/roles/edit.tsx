import { Head, Link } from '@inertiajs/react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import { PermissionGroups } from '@/components/authorization/permission-groups';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { RoleForm } from '@/components/authorization/role-form';
import Heading from '@/components/heading';
import { Button } from '@/components/ui/button';
import type { DelegablePermissions, PermissionGroup } from '@/types';

type Props = {
    role: {
        id: number;
        name: string;
        is_system: boolean;
        users_count: number;
        permissions: string[];
    };
    canManage: boolean;
    permissionGroups: PermissionGroup[];
    delegablePermissions: DelegablePermissions;
};

export default function EditRole({
    role,
    canManage,
    permissionGroups,
    delegablePermissions,
}: Props) {
    return (
        <>
            <Head title={`Edit ${role.name}`} />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-center gap-3">
                    <Heading
                        title={canManage ? `Edit ${role.name}` : role.name}
                        description={`Assigned to ${role.users_count} ${role.users_count === 1 ? 'user' : 'users'}.`}
                    />
                    {role.is_system && <SystemRoleBadge />}
                </div>

                {canManage ? (
                    <RoleForm
                        action={RoleController.update(String(role.id))}
                        cancelHref={RoleController.index.url()}
                        permissionGroups={permissionGroups}
                        delegablePermissions={delegablePermissions}
                        initialName={role.name}
                        initialPermissions={role.permissions}
                        submitLabel="Save changes"
                    />
                ) : (
                    <div className="space-y-6">
                        <div className="bg-muted/50 rounded-lg border px-4 py-3 text-sm">
                            {role.is_system
                                ? 'Admin is a protected system role. It cannot be renamed or deleted, and it always has every permission, including permissions created later.'
                                : 'This role includes permissions you do not have, so you can view it but not change it.'}
                        </div>
                        <PermissionGroups
                            groups={permissionGroups}
                            selected={
                                role.is_system
                                    ? permissionGroups.flatMap((group) =>
                                          group.permissions.map(
                                              (permission) => permission.name,
                                          ),
                                      )
                                    : role.permissions
                            }
                            readOnly
                        />
                        <Button variant="outline" asChild>
                            <Link href={RoleController.index.url()}>
                                Back to roles
                            </Link>
                        </Button>
                    </div>
                )}
            </div>
        </>
    );
}

EditRole.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Roles', href: RoleController.index() },
        {
            title: props.role.name,
            href: RoleController.edit(String(props.role.id)),
        },
    ],
});
