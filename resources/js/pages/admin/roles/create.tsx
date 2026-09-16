import { Head } from '@inertiajs/react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import { RoleForm } from '@/components/authorization/role-form';
import type { DelegablePermissions, PermissionGroup } from '@/types';

type Props = {
    permissionGroups: PermissionGroup[];
    delegablePermissions: DelegablePermissions;
};

export default function CreateRole({
    permissionGroups,
    delegablePermissions,
}: Props) {
    return (
        <>
            <Head title="Create role" />

            <div className="p-4 md:p-6">
                <RoleForm
                    action={RoleController.store()}
                    cancelHref={RoleController.index.url()}
                    permissionGroups={permissionGroups}
                    delegablePermissions={delegablePermissions}
                    submitLabel="Create role"
                />
            </div>
        </>
    );
}

CreateRole.layout = () => ({
    breadcrumbs: [
        { title: 'Roles & permissions', href: RoleController.index() },
        { title: 'Create role', href: RoleController.create() },
    ],
});
