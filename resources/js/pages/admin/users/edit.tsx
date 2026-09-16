import { Head } from '@inertiajs/react';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { UserForm } from '@/components/users/user-form';

type Props = {
    user: {
        id: number;
        name: string;
        email: string;
        avatar: string | null;
        created_at: string | null;
    };
    passwordRules: string;
};

export default function EditUser({ user, passwordRules }: Props) {
    return (
        <>
            <Head title={`Edit ${user.name}`} />

            <div className="p-4 md:p-6">
                <UserForm
                    key={user.id}
                    action={UserController.update(user.id)}
                    cancelHref={UserController.index.url()}
                    passwordRules={passwordRules}
                    initial={{ name: user.name, email: user.email }}
                    submitLabel="Save changes"
                />
            </div>
        </>
    );
}

EditUser.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'Users', href: UserController.index() },
        { title: props.user.name, href: UserController.edit(props.user.id) },
    ],
});
