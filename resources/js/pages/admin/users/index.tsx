import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    MoreHorizontalIcon,
    Search01Icon,
    UserLock01Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import UserAccessController from '@/actions/App/Http/Controllers/Admin/UserAccessController';
import UserController from '@/actions/App/Http/Controllers/Admin/UserController';
import { RoleBadge } from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { SimplePagination } from '@/components/simple-pagination';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { UserInfo } from '@/components/user-info';
import { useAuthorization } from '@/hooks/use-authorization';
import { useQueryFilters } from '@/hooks/use-query-filters';
import type { Paginator, User, UserListItem } from '@/types';

type Props = {
    users: Paginator<UserListItem>;
    roles: string[];
    filters: { search: string; role: string | null };
};

const ALL_ROLES = '__all__';

export default function UsersIndex({ users, roles, filters }: Props) {
    const { can } = useAuthorization();
    const { filters: current, setFilter } = useQueryFilters(
        UserController.index.url(),
        filters,
    );
    const hasFilters = Boolean(filters.search || filters.role);
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

    return (
        <>
            <Head title="Users" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Users"
                        description="Everyone with an account, and the roles and permissions they have."
                    />
                    {can('users.create') && (
                        <Button asChild>
                            <Link href={UserController.create.url()}>
                                <Icon iconNode={Add01Icon} />
                                Create user
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                    <div className="relative flex-1 sm:max-w-sm">
                        <Icon
                            iconNode={Search01Icon}
                            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
                        />
                        <Input
                            type="search"
                            value={current.search}
                            onChange={(event) =>
                                setFilter('search', event.target.value)
                            }
                            placeholder="Search by name or email"
                            className="pl-9"
                            aria-label="Search users"
                        />
                    </div>
                    <Select
                        value={current.role ?? ALL_ROLES}
                        onValueChange={(value) =>
                            setFilter(
                                'role',
                                value === ALL_ROLES ? null : value,
                            )
                        }
                    >
                        <SelectTrigger
                            className="sm:w-48"
                            aria-label="Filter by role"
                        >
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value={ALL_ROLES}>All roles</SelectItem>
                            {roles.map((role) => (
                                <SelectItem key={role} value={role}>
                                    {role}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {users.data.length === 0 ? (
                    <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-16 text-center text-sm">
                        {hasFilters
                            ? 'No users match these filters.'
                            : 'There are no users yet.'}
                    </div>
                ) : (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Roles</TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                        Direct permissions
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Joined
                                    </TableHead>
                                    <TableHead className="w-0">
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {users.data.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <UserInfo
                                                    user={
                                                        {
                                                            ...user,
                                                            avatar:
                                                                user.avatar ??
                                                                undefined,
                                                        } as unknown as User
                                                    }
                                                    showEmail
                                                />
                                            </div>
                                        </TableCell>
                                        <TableCell className="whitespace-normal">
                                            <div className="flex min-w-32 flex-wrap gap-1">
                                                {user.roles.length > 0 ? (
                                                    user.roles.map((role) => (
                                                        <RoleBadge
                                                            key={role}
                                                            name={role}
                                                        />
                                                    ))
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">
                                                        No roles
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden whitespace-normal lg:table-cell">
                                            {user.permissions.length > 0 ? (
                                                <div className="flex max-w-xs flex-wrap gap-1">
                                                    {user.permissions.map(
                                                        (permission) => (
                                                            <code
                                                                key={permission}
                                                                className="bg-muted rounded px-1.5 py-0.5 font-mono text-[11px]"
                                                            >
                                                                {permission}
                                                            </code>
                                                        ),
                                                    )}
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    None
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground hidden md:table-cell">
                                            {user.created_at
                                                ? new Date(
                                                      user.created_at,
                                                  ).toLocaleDateString()
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                {can('users.update') && (
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={UserAccessController.edit.url(
                                                                user.id,
                                                            )}
                                                        >
                                                            <Icon
                                                                iconNode={
                                                                    UserLock01Icon
                                                                }
                                                            />
                                                            <span className="hidden sm:inline">
                                                                Manage access
                                                            </span>
                                                            <span className="sr-only sm:hidden">
                                                                Manage access
                                                                for {user.name}
                                                            </span>
                                                        </Link>
                                                    </Button>
                                                )}
                                                <UserActions
                                                    user={user}
                                                    onDelete={() => {
                                                        setDeleteError(
                                                            undefined,
                                                        );
                                                        setDeleting(user);
                                                    }}
                                                />
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <SimplePagination paginator={users} noun="users" />
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
