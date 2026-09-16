import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
};

export default function EditUser({ user }: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('users.edit.head', { name: user.name })} />

            <div className="p-4 md:p-6">
                <UserForm
                    key={user.id}
                    action={UserController.update(user.id)}
                    passwordResetUrl={UserController.sendPasswordReset.url(
                        user.id,
                    )}
                    initial={{ name: user.name, email: user.email }}
                    submitLabel={t('common.save_changes')}
                />
            </div>
        </>
    );
}

EditUser.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'navigation.users', href: UserController.index() },
        {
            title: props.user.name,
            href: UserController.edit(props.user.id),
            literal: true,
        },
    ],
});
