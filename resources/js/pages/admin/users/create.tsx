import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { UserForm } from '@/components/users/user-form';
import type { AssignableRole } from '@/types';

type Props = {
    roles: AssignableRole[];
    passwordRules: string;
};

export default function CreateUser({ roles, passwordRules }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('users.create.title')} />

            <div className="p-4 md:p-6">
                <UserForm
                    action={UserController.store()}
                    passwordRules={passwordRules}
                    roles={roles}
                    submitLabel={t('users.create.title')}
                />
            </div>
        </>
    );
}

CreateUser.layout = () => ({
    breadcrumbs: [
        { title: 'navigation.users', href: UserController.index() },
        { title: 'users.create.title', href: UserController.create() },
    ],
});
