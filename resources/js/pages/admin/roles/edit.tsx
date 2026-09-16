import { Head } from '@inertiajs/react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import { RoleForm } from '@/components/authorization/role-form';
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
    const allPermissions = permissionGroups.flatMap((group) =>
        group.permissions.map((permission) => permission.name),
    );

    return (
        <>
            <Head title={role.name} />

            <div className="p-4 md:p-6">
                <RoleForm
                    // Remount when the role changes so the form resets.
                    key={role.id}
                    action={RoleController.update(String(role.id))}
                    cancelHref={RoleController.index.url()}
                    permissionGroups={permissionGroups}
                    delegablePermissions={delegablePermissions}
                    initialName={role.name}
                    // Admin always has every permission, including new ones.
                    initialPermissions={
                        role.is_system ? allPermissions : role.permissions
                    }
                    submitLabel="Save changes"
                    readOnly={!canManage}
                    isSystem={role.is_system}
                    notice={
                        role.is_system
                            ? 'System roles keep their name and always have every permission, including permissions created later.'
                            : !canManage
                              ? 'This role includes permissions you do not have, so you can view it but not change it.'
                              : undefined
                    }
                />
            </div>
        </>
    );
}

EditRole.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Roles & permissions', href: RoleController.index() },
        {
            title: props.role.name,
            href: RoleController.edit(String(props.role.id)),
        },
    ],
});
