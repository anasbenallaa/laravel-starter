import { Head } from '@inertiajs/react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import { RoleForm } from '@/components/authorization/role-form';
import Heading from '@/components/heading';
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
            <Head title="New role" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="New role"
                    description="Name the role and choose what its members can do."
                />

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
        { title: 'Roles', href: RoleController.index() },
        { title: 'New role', href: RoleController.create() },
    ],
});
