import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    Search01Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { useState } from 'react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { SimplePagination } from '@/components/simple-pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useAuthorization } from '@/hooks/use-authorization';
import { useQueryFilters } from '@/hooks/use-query-filters';
import type { Paginator, RoleListItem } from '@/types';

type Props = {
    roles: Paginator<RoleListItem>;
    filters: { search: string };
};

function plural(count: number, word: string) {
    return `${count} ${count === 1 ? word : `${word}s`}`;
}

export default function RolesIndex({ roles, filters }: Props) {
    const { can } = useAuthorization();
    const { filters: current, setFilter } = useQueryFilters(
        RoleController.index.url(),
        filters,
    );
    const [deleting, setDeleting] = useState<RoleListItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteError, setDeleteError] = useState<string>();

    const confirmDelete = () => {
        if (!deleting) {
            return;
        }

        router.delete(RoleController.destroy.url(String(deleting.id)), {
            preserveScroll: true,
            onStart: () => setProcessing(true),
            onFinish: () => setProcessing(false),
            onSuccess: () => setDeleting(null),
            onError: (errors) => setDeleteError(errors.role),
        });
    };

    return (
        <>
            <Head title="Roles" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Roles"
                        description="Bundles of permissions you can assign to users."
                    />
                    {can('roles.create') && (
                        <Button asChild>
                            <Link href={RoleController.create.url()}>
                                <Icon iconNode={Add01Icon} />
                                New role
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="relative sm:max-w-sm">
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
                        placeholder="Search roles"
                        className="pl-9"
                        aria-label="Search roles"
                    />
                </div>

                {roles.data.length === 0 ? (
                    <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-16 text-center text-sm">
                        {filters.search
                            ? 'No roles match your search.'
                            : 'There are no roles yet.'}
                    </div>
                ) : (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Users</TableHead>
                                    <TableHead>Permissions</TableHead>
                                    <TableHead className="hidden sm:table-cell">
                                        Type
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Created
                                    </TableHead>
                                    <TableHead className="w-0">
                                        <span className="sr-only">Actions</span>
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.data.map((role) => (
                                    <TableRow key={role.id}>
                                        <TableCell className="font-medium">
                                            {role.name}
                                        </TableCell>
                                        <TableCell>
                                            {plural(role.users_count, 'user')}
                                        </TableCell>
                                        <TableCell>
                                            {role.is_system
                                                ? 'All permissions'
                                                : plural(
                                                      role.permissions_count,
                                                      'permission',
                                                  )}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            {role.is_system ? (
                                                <SystemRoleBadge />
                                            ) : (
                                                <Badge variant="secondary">
                                                    Custom
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground hidden md:table-cell">
                                            {role.created_at
                                                ? new Date(
                                                      role.created_at,
                                                  ).toLocaleDateString()
                                                : '—'}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex justify-end gap-1">
                                                {can('roles.update') && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        asChild
                                                    >
                                                        <Link
                                                            href={RoleController.edit.url(
                                                                String(role.id),
                                                            )}
                                                        >
                                                            <Icon
                                                                iconNode={
                                                                    Edit02Icon
                                                                }
                                                            />
                                                            <span className="hidden sm:inline">
                                                                {role.is_system ||
                                                                !role.can_manage
                                                                    ? 'View'
                                                                    : 'Edit'}
                                                            </span>
                                                        </Link>
                                                    </Button>
                                                )}
                                                {can('roles.delete') &&
                                                    !role.is_system &&
                                                    role.can_manage && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-destructive-foreground hover:text-destructive-foreground"
                                                            aria-label={`Delete ${role.name}`}
                                                            onClick={() => {
                                                                setDeleteError(
                                                                    undefined,
                                                                );
                                                                setDeleting(
                                                                    role,
                                                                );
                                                            }}
                                                        >
                                                            <Icon
                                                                iconNode={
                                                                    Delete02Icon
                                                                }
                                                            />
                                                        </Button>
                                                    )}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <SimplePagination paginator={roles} noun="roles" />
            </div>

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Delete role "${deleting?.name}"?`}
                confirmLabel="Delete role"
                processing={processing}
                onConfirm={confirmDelete}
            >
                {deleting && deleting.users_count > 0 ? (
                    <p className="text-foreground font-medium">
                        This role is assigned to{' '}
                        {plural(deleting.users_count, 'user')}. Deleting it will
                        remove this role from{' '}
                        {deleting.users_count === 1
                            ? 'that user'
                            : 'those users'}{' '}
                        and they will lose the permissions inherited from it.
                    </p>
                ) : (
                    <p>This role is not assigned to any users.</p>
                )}
                <p>This action cannot be undone.</p>
                <InputError message={deleteError} />
            </ConfirmDialog>
        </>
    );
}

RolesIndex.layout = () => ({
    breadcrumbs: [{ title: 'Roles', href: RoleController.index() }],
});
