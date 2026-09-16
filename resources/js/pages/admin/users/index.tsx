import {
    Activity01Icon,
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    MoreHorizontalIcon,
    UserLock01Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import ActivityController from '@/actions/App/Http/Controllers/ActivityController';
import UserAccessController from '@/actions/App/Http/Controllers/Admin/UserAccessController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { RoleBadge } from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type {
    DataTableColumn,
    DataTableSort,
} from '@/components/data-table/data-table';
import { DataTable } from '@/components/data-table/data-table';
import InputError from '@/components/input-error';
import { Ltr } from '@/components/ltr';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { UserInfo } from '@/components/user-info';
import { useAuthorization } from '@/hooks/use-authorization';
import { useFormatters } from '@/hooks/use-formatters';
import type { Paginator, User, UserListItem } from '@/types';

type Props = {
    users: Paginator<UserListItem>;
    roles: string[];
    filters: { search: string; role: string | null };
    sort: DataTableSort;
};

export default function UsersIndex({ users, roles, filters, sort }: Props) {
    const { can } = useAuthorization();
    const { t } = useTranslation();
    const { date } = useFormatters();
    const [deleting, setDeleting] = useState<UserListItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteError, setDeleteError] = useState<string>();

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(UserController.destroy.url(deleting.id), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => setDeleting(null),
            onError: (errors) => setDeleteError(errors.user),
        });
    };

    const columns: DataTableColumn<UserListItem>[] = [
        {
            id: 'user',
            header: t('users.table.user'),
            sortKey: 'name',
            cell: (user) => (
                <div className="flex min-w-48 items-center gap-3">
                    <UserInfo
                        user={
                            {
                                ...user,
                                avatar: user.avatar ?? undefined,
                            } as unknown as User
                        }
                        showEmail
                    />
                </div>
            ),
        },
        {
            id: 'roles',
            header: t('users.form.roles_title'),
            wrap: true,
            cell: (user) =>
                user.roles.length > 0 ? (
                    <div className="flex min-w-32 flex-wrap gap-1">
                        {user.roles.map((role) => (
                            <RoleBadge key={role} name={role} />
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">
                        {t('users.table.no_roles')}
                    </span>
                ),
        },
        {
            id: 'permissions',
            header: t('users.access.direct_title'),
            visibleFrom: 'lg',
            wrap: true,
            cell: (user) =>
                user.permissions.length > 0 ? (
                    <div className="flex max-w-xs flex-wrap gap-1">
                        {user.permissions.map((permission) => (
                            <code
                                key={permission}
                                className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]"
                            >
                                <Ltr>{permission}</Ltr>
                            </code>
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">
                        {t('common.none')}
                    </span>
                ),
        },
        {
            id: 'joined',
            header: t('users.table.joined'),
            sortKey: 'created_at',
            visibleFrom: 'md',
            className: 'text-muted-foreground',
            cell: (user) => (user.created_at ? date(user.created_at) : '—'),
        },
        {
            id: 'actions',
            header: <span className="sr-only">{t('common.actions')}</span>,
            align: 'end',
            className: 'w-0',
            cell: (user) => (
                <div className="flex items-center justify-end gap-1">
                    {can('users.update') && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={UserAccessController.edit.url(user.id)}>
                                <Icon iconNode={UserLock01Icon} />
                                <span className="hidden sm:inline">
                                    {t('users.actions.manage_access')}
                                </span>
                                <span className="sr-only sm:hidden">
                                    {t('users.actions.manage_access_for', {
                                        name: user.name,
                                    })}
                                </span>
                            </Link>
                        </Button>
                    )}
                    <UserActions
                        user={user}
                        onDelete={() => {
                            setDeleteError(undefined);
                            setDeleting(user);
                        }}
                    />
                </div>
            ),
        },
    ];

    return (
        <>
            <Head title={t('navigation.users')} />

            <div className="p-4 md:p-6">
                <DataTable
                    title={t('navigation.users')}
                    description={t('users.index.description')}
                    url={UserController.index.url()}
                    paginator={users}
                    columns={columns}
                    rowKey={(user) => user.id}
                    sort={sort}
                    search={{
                        value: filters.search,
                        placeholder: t('users.index.search'),
                    }}
                    filters={[
                        {
                            key: 'role',
                            label: t('users.index.filter_role'),
                            value: filters.role,
                            allLabel: t('users.index.all_roles'),
                            options: roles.map((role) => ({
                                value: role,
                                label: role,
                            })),
                        },
                    ]}
                    actions={
                        can('users.create') && (
                            <Button asChild>
                                <Link href={UserController.create.url()}>
                                    <Icon iconNode={Add01Icon} />
                                    <span className="hidden sm:inline">
                                        {t('users.create.title')}
                                    </span>
                                    <span className="sr-only sm:hidden">
                                        {t('users.create.title')}
                                    </span>
                                </Link>
                            </Button>
                        )
                    }
                    countLabel={(count) => t('users.count', { count })}
                    emptyMessage={t('users.index.empty')}
                    emptyFilteredMessage={t('users.index.empty_filtered')}
                />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={t('users.delete.title', { name: deleting?.name })}
                confirmLabel={t('users.actions.delete')}
                processing={processing}
                onConfirm={confirmDelete}
            >
                <p className="text-foreground">
                    {t('users.delete.description_before')}
                    <Ltr className="font-medium">{deleting?.email}</Ltr>
                    {t('users.delete.description_after')}
                </p>
                <p>{t('common.cannot_be_undone')}</p>
                <InputError message={deleteError} />
            </ConfirmDialog>
        </>
    );
}

/**
 * Edit / delete menu. Hidden when the user can't manage this account (for
 * example an admin, or someone with more access); the server enforces the
 * same rules.
 */
function UserActions({
    user,
    onDelete,
}: {
    user: UserListItem;
    onDelete: () => void;
}) {
    const { can } = useAuthorization();
    const { t } = useTranslation();
    const canEdit = can('users.update') && user.can_manage;
    const canDelete = can('users.delete') && user.can_manage && !user.is_self;
    const canViewActivities = can('activities.view.all');

    if (!canEdit && !canDelete && !canViewActivities) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={t('common.actions_for', { name: user.name })}
                >
                    <Icon iconNode={MoreHorizontalIcon} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {canEdit && (
                    <DropdownMenuItem asChild>
                        <Link href={UserController.edit.url(user.id)}>
                            <Icon iconNode={Edit02Icon} />
                            {t('users.actions.edit')}
                        </Link>
                    </DropdownMenuItem>
                )}
                {canViewActivities && (
                    <DropdownMenuItem asChild>
                        <Link
                            href={ActivityController.index.url({
                                query: { user: user.id },
                            })}
                        >
                            <Icon iconNode={Activity01Icon} />
                            {t('users.actions.view_activities')}
                        </Link>
                    </DropdownMenuItem>
                )}
                {(canEdit || canViewActivities) && canDelete && (
                    <DropdownMenuSeparator />
                )}
                {canDelete && (
                    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                        <Icon iconNode={Delete02Icon} />
                        {t('users.actions.delete')}
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

UsersIndex.layout = () => ({
    breadcrumbs: [{ title: 'navigation.users', href: UserController.index() }],
});
