import { Head } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { UserForm } from '@/components/users/user-form';
import type { AssignableRole } from '@/types';

type Props = {
    roles: AssignableRole[];
    passwordRules: string;
};

export default function CreateUser({ roles, passwordRules }: Props) {
    return (
        <>
            <Head title="Create user" />

            <div className="p-4 md:p-6">
                <UserForm
                    action={UserController.store()}
                    cancelHref={UserController.index.url()}
                    passwordRules={passwordRules}
                    roles={roles}
                    submitLabel="Create user"
                />
            </div>
        </>
    );
}

CreateUser.layout = () => ({
    breadcrumbs: [
        { title: 'Users', href: UserController.index() },
        { title: 'Create user', href: UserController.create() },
    ],
});
