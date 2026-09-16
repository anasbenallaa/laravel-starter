import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('roles.create.title')} />

            <div className="p-4 md:p-6">
                <RoleForm
                    action={RoleController.store()}
                    permissionGroups={permissionGroups}
                    delegablePermissions={delegablePermissions}
                    submitLabel={t('roles.create.title')}
                />
            </div>
        </>
    );
}

CreateRole.layout = () => ({
    breadcrumbs: [
        { title: 'navigation.roles_permissions', href: RoleController.index() },
        { title: 'roles.create.title', href: RoleController.create() },
    ],
});
