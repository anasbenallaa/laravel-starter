import {
    Add01Icon,
    Cancel01Icon,
    Delete02Icon,
    Edit02Icon,
    Search01Icon,
    Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { Fragment, useState } from 'react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { SimplePagination } from '@/components/simple-pagination';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuthorization } from '@/hooks/use-authorization';
import { useQueryFilters } from '@/hooks/use-query-filters';
import { permissionLabel, resourceLabel } from '@/lib/permissions';
import type { Paginator, PermissionGroup, RoleListItem } from '@/types';

type Props = {
    roles: Paginator<RoleListItem>;
    permissionGroups: PermissionGroup[];
    filters: { search: string };
};

type View = 'roles' | 'matrix';

function plural(count: number, word: string) {
    return count === 1 ? word : `${word}s`;
}

/** One-line summary derived from what the role can actually access. */
function roleSummary(role: RoleListItem): string {
    if (role.is_system) {
        return 'Full access to every permission.';
    }

    const resources = [
        ...new Set(role.permissions.map((name) => name.split('.')[0])),
    ].map(resourceLabel);

    if (resources.length === 0) {
        return 'No permissions assigned yet.';
    }

    return `Access to ${resources.slice(0, 3).join(', ')}${resources.length > 3 ? ` and ${resources.length - 3} more` : ''}.`;
}

export default function RolesIndex({
    roles,
    permissionGroups,
    filters,
}: Props) {
    const { can } = useAuthorization();
    const { filters: current, setFilter } = useQueryFilters(
        RoleController.index.url(),
        filters,
    );
    const [view, setView] = useState<View>('roles');
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
            <Head title="Roles & permissions" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                    <div className="space-y-1">
                        <h1 className="text-xl font-semibold tracking-tight">
                            Roles & permissions
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            Manage what users can access. Members inherit every
                            permission of their roles.
                        </p>
                    </div>
                    {can('roles.create') && (
                        <Button asChild>
                            <Link href={RoleController.create.url()}>
                                <Icon iconNode={Add01Icon} />
                                Create role
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="relative w-full sm:max-w-sm">
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
                    <ToggleGroup
                        type="single"
                        variant="outline"
                        value={view}
                        onValueChange={(value) =>
                            value && setView(value as View)
                        }
                        aria-label="View"
                    >
                        <ToggleGroupItem value="roles" className="px-3">
                            Roles
                        </ToggleGroupItem>
                        <ToggleGroupItem value="matrix" className="px-3">
                            Matrix
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>

                {roles.data.length === 0 ? (
                    <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-16 text-center text-sm">
                        {filters.search
                            ? 'No roles match your search.'
                            : 'There are no roles yet.'}
                    </div>
                ) : view === 'roles' ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {roles.data.map((role) => (
                            <article
                                key={role.id}
                                className="bg-card flex flex-col gap-4 rounded-xl border p-5"
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center gap-2">
                                        <h2 className="font-medium">
                                            {role.name}
                                        </h2>
                                        {role.is_system && <SystemRoleBadge />}
                                    </div>
                                    <p className="text-muted-foreground text-sm">
                                        {roleSummary(role)}
                                    </p>
                                </div>

                                <div className="text-muted-foreground flex gap-5 text-sm">
                                    <span>
                                        <span className="text-foreground font-semibold tabular-nums">
                                            {role.is_system
                                                ? 'All'
                                                : role.permissions_count}
                                        </span>{' '}
                                        {role.is_system
                                            ? 'permissions'
                                            : plural(
                                                  role.permissions_count,
                                                  'permission',
                                              )}
                                    </span>
                                    <span>
                                        <span className="text-foreground font-semibold tabular-nums">
                                            {role.users_count}
                                        </span>{' '}
                                        {plural(role.users_count, 'user')}
                                    </span>
                                </div>

                                <div className="mt-auto flex items-center justify-between gap-2">
                                    {can('roles.update') ? (
                                        <Button variant="outline" asChild>
                                            <Link
                                                href={RoleController.edit.url(
                                                    String(role.id),
                                                )}
                                            >
                                                <Icon iconNode={Edit02Icon} />
                                                {role.can_manage &&
                                                !role.is_system
                                                    ? 'Manage permissions'
                                                    : 'View permissions'}
                                            </Link>
                                        </Button>
                                    ) : (
                                        <span />
                                    )}
                                    {can('roles.delete') &&
                                        !role.is_system &&
                                        role.can_manage && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="text-destructive-foreground hover:text-destructive-foreground"
                                                aria-label={`Delete ${role.name}`}
                                                onClick={() => {
                                                    setDeleteError(undefined);
                                                    setDeleting(role);
                                                }}
                                            >
                                                <Icon iconNode={Delete02Icon} />
                                            </Button>
                                        )}
                                </div>
                            </article>
                        ))}
                    </div>
                ) : (
                    <PermissionMatrix
                        roles={roles.data}
                        groups={permissionGroups}
                    />
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
                        This role is assigned to {deleting.users_count}{' '}
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

/** Read-only grid of which role has which permission. */
function PermissionMatrix({
    roles,
    groups,
}: {
    roles: RoleListItem[];
    groups: PermissionGroup[];
}) {
    const granted = new Map(
        roles.map((role) => [role.id, new Set(role.permissions)]),
    );

    return (
        <div className="bg-card overflow-hidden rounded-xl border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-sm">Permission</TableHead>
                        {roles.map((role) => (
                            <TableHead
                                key={role.id}
                                className="text-center text-sm"
                            >
                                {role.name}
                            </TableHead>
                        ))}
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {groups.map((group) => (
                        <Fragment key={group.resource}>
                            <TableRow className="bg-muted/50 hover:bg-muted/50">
                                <TableCell
                                    colSpan={roles.length + 1}
                                    className="text-muted-foreground py-2 text-xs font-medium tracking-wide uppercase"
                                >
                                    {resourceLabel(group.resource)}
                                </TableCell>
                            </TableRow>
                            {group.permissions.map((permission) => (
                                <TableRow key={permission.id}>
                                    <TableCell title={permission.name}>
                                        {permissionLabel(permission.name)}
                                    </TableCell>
                                    {roles.map((role) => {
                                        const has =
                                            role.is_system ||
                                            granted
                                                .get(role.id)
                                                ?.has(permission.name);

                                        return (
                                            <TableCell
                                                key={role.id}
                                                className="text-center"
                                            >
                                                <Icon
                                                    iconNode={
                                                        has
                                                            ? Tick02Icon
                                                            : Cancel01Icon
                                                    }
                                                    className={
                                                        has
                                                            ? 'inline size-4 text-emerald-600 dark:text-emerald-400'
                                                            : 'text-muted-foreground/50 inline size-4'
                                                    }
                                                    aria-label={
                                                        has
                                                            ? 'Granted'
                                                            : 'Not granted'
                                                    }
                                                />
                                            </TableCell>
                                        );
                                    })}
                                </TableRow>
                            ))}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

RolesIndex.layout = () => ({
    breadcrumbs: [
        { title: 'Roles & permissions', href: RoleController.index() },
    ],
});
