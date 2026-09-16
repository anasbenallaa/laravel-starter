import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    MoreHorizontalIcon,
    UserLock01Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
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
import type { Paginator, User, UserListItem } from '@/types';

type Props = {
    users: Paginator<UserListItem>;
    roles: string[];
    filters: { search: string; role: string | null };
    sort: DataTableSort;
};

export default function UsersIndex({ users, roles, filters, sort }: Props) {
    const { can } = useAuthorization();
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
            header: 'User',
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
            header: 'Roles',
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
                        No roles
                    </span>
                ),
        },
        {
            id: 'permissions',
            header: 'Direct permissions',
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
                                {permission}
                            </code>
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                ),
        },
        {
            id: 'joined',
            header: 'Joined',
            sortKey: 'created_at',
            visibleFrom: 'md',
            className: 'text-muted-foreground',
            cell: (user) =>
                user.created_at
                    ? new Date(user.created_at).toLocaleDateString()
                    : '—',
        },
        {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            className: 'w-0',
            cell: (user) => (
                <div className="flex items-center justify-end gap-1">
                    {can('users.update') && (
                        <Button variant="outline" size="sm" asChild>
                            <Link href={UserAccessController.edit.url(user.id)}>
                                <Icon iconNode={UserLock01Icon} />
                                <span className="hidden sm:inline">
                                    Manage access
                                </span>
                                <span className="sr-only sm:hidden">
                                    Manage access for {user.name}
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
            <Head title="Users" />

            <div className="p-4 md:p-6">
                <DataTable
                    title="Users"
                    description="Everyone with an account, and the roles and permissions they have."
                    url={UserController.index.url()}
                    paginator={users}
                    columns={columns}
                    rowKey={(user) => user.id}
                    sort={sort}
                    search={{
                        value: filters.search,
                        placeholder: 'Search by name or email',
                    }}
                    filters={[
                        {
                            key: 'role',
                            label: 'Role',
                            value: filters.role,
                            allLabel: 'All roles',
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
                                        Create user
                                    </span>
                                    <span className="sr-only sm:hidden">
                                        Create user
                                    </span>
                                </Link>
                            </Button>
                        )
                    }
                    noun="users"
                    emptyMessage="There are no users yet."
                    emptyFilteredMessage="No users match your search or filters."
                />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Delete ${deleting?.name}?`}
                confirmLabel="Delete user"
                processing={processing}
                onConfirm={confirmDelete}
            >
                <p className="text-foreground">
                    The account for{' '}
                    <span className="font-medium">{deleting?.email}</span> will
                    be permanently deleted, along with their roles, direct
                    permissions and notifications. They will no longer be able
                    to sign in.
                </p>
                <p>This action cannot be undone.</p>
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
    const canEdit = can('users.update') && user.can_manage;
    const canDelete = can('users.delete') && user.can_manage && !user.is_self;

    if (!canEdit && !canDelete) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="size-8"
                    aria-label={`Actions for ${user.name}`}
                >
                    <Icon iconNode={MoreHorizontalIcon} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {canEdit && (
                    <DropdownMenuItem asChild>
                        <Link href={UserController.edit.url(user.id)}>
                            <Icon iconNode={Edit02Icon} />
                            Edit user
                        </Link>
                    </DropdownMenuItem>
                )}
                {canEdit && canDelete && <DropdownMenuSeparator />}
                {canDelete && (
                    <DropdownMenuItem variant="destructive" onSelect={onDelete}>
                        <Icon iconNode={Delete02Icon} />
                        Delete user
                    </DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

UsersIndex.layout = () => ({
    breadcrumbs: [{ title: 'Users', href: UserController.index() }],
});
