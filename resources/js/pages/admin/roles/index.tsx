import {
    Add01Icon,
    Cancel01Icon,
    Delete02Icon,
    Edit02Icon,
    MoreHorizontalIcon,
    Tick02Icon,
    ViewIcon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { useMemo, useState } from 'react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import {
    RoleBadge,
    SystemRoleBadge,
} from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { DataTable } from '@/components/data-table/data-table';
import InputError from '@/components/input-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Icon } from '@/components/ui/icon';
import { useAuthorization } from '@/hooks/use-authorization';
import { permissionLabel, resourceLabel } from '@/lib/permissions';
import type {
    Paginator,
    PermissionGroup,
    PermissionListItem,
    RoleListItem,
} from '@/types';

type Props = {
    /** Null when the user can't view roles. */
    roles: Paginator<RoleListItem> | null;
    /** Null when the user can't view permissions. */
    permissions: PermissionListItem[] | null;
    permissionGroups: PermissionGroup[];
    filters: { search: string };
};

type View = 'roles' | 'matrix' | 'permissions';

type PermissionRow = {
    id: number;
    name: string;
    resource: string;
    action: string;
};

const VIEW_LABELS: Record<View, string> = {
    roles: 'Roles',
    matrix: 'Matrix',
    permissions: 'Permissions',
};

/** Same action order as the role form (PermissionRegistry). */
const ACTION_ORDER = ['view', 'create', 'update', 'delete'];

function actionRank(action: string): number {
    const index = ACTION_ORDER.indexOf(action);

    return index === -1 ? ACTION_ORDER.length : index;
}

function byResourceThenAction<Row extends { resource: string; action: string }>(
    a: Row,
    b: Row,
) {
    return (
        a.resource.localeCompare(b.resource) ||
        actionRank(a.action) - actionRank(b.action) ||
        a.action.localeCompare(b.action)
    );
}

function plural(count: number, word: string) {
    return count === 1 ? word : `${word}s`;
}

function initialView(available: View[]): View {
    const requested =
        typeof window !== 'undefined'
            ? new URLSearchParams(window.location.search).get('view')
            : null;

    return available.includes(requested as View)
        ? (requested as View)
        : available[0];
}

function matchesPermission(
    row: { name: string; resource: string },
    search: string,
    resource: string | null,
) {
    const needle = search.trim().toLowerCase();

    return (
        (!resource || row.resource === resource) &&
        (!needle ||
            row.name.includes(needle) ||
            permissionLabel(row.name).toLowerCase().includes(needle))
    );
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

export default function RolesPermissions({
    roles,
    permissions,
    permissionGroups,
    filters,
}: Props) {
    const { can } = useAuthorization();
    const views: View[] = [
        ...(roles ? (['roles', 'matrix'] as View[]) : []),
        ...(permissions ? (['permissions'] as View[]) : []),
    ];
    const [view, setView] = useState<View>(() => initialView(views));
    // Global search links here with ?permission=<name> to pre-fill the search.
    const [permissionSearch, setPermissionSearch] = useState(() =>
        typeof window !== 'undefined'
            ? (new URLSearchParams(window.location.search).get('permission') ??
              '')
            : '',
    );
    const [resource, setResource] = useState<string | null>(null);
    const [deleting, setDeleting] = useState<RoleListItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const [deleteError, setDeleteError] = useState<string>();

    const changeView = (next: string) => {
        setView(next as View);

        const url = new URL(window.location.href);
        url.searchParams.set('view', next);
        window.history.replaceState(window.history.state, '', url);
    };

    const matrixRows = useMemo<PermissionRow[]>(
        () =>
            permissionGroups
                .flatMap((group) =>
                    group.permissions.map((permission) => ({
                        ...permission,
                        resource: group.resource,
                    })),
                )
                .filter((row) =>
                    matchesPermission(row, permissionSearch, resource),
                )
                .sort(byResourceThenAction),
        [permissionGroups, permissionSearch, resource],
    );
    const permissionRows = useMemo(
        () =>
            (permissions ?? [])
                .filter((row) =>
                    matchesPermission(row, permissionSearch, resource),
                )
                .sort(byResourceThenAction),
        [permissions, permissionSearch, resource],
    );
    const resourceOptions = useMemo(
        () =>
            [...new Set(permissionGroups.map((group) => group.resource))]
                .sort()
                .map((value) => ({ value, label: resourceLabel(value) })),
        [permissionGroups],
    );

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

    const tableProps = {
        title: 'Roles & permissions',
        description:
            'Manage what users can access. Members inherit every permission of their roles; permissions are defined in code by each feature.',
        tabs: views.map((value) => ({ value, label: VIEW_LABELS[value] })),
        activeTab: view,
        onTabChange: changeView,
        actions:
            roles && can('roles.create') ? (
                <Button asChild>
                    <Link href={RoleController.create.url()}>
                        <Icon iconNode={Add01Icon} />
                        <span className="hidden sm:inline">Create role</span>
                        <span className="sr-only sm:hidden">Create role</span>
                    </Link>
                </Button>
            ) : undefined,
    };

    const localPermissionControls = {
        search: {
            value: permissionSearch,
            placeholder: 'Search permissions',
            onChange: setPermissionSearch,
        },
        filters: [
            {
                key: 'resource',
                label: 'Resource',
                value: resource,
                allLabel: 'All resources',
                options: resourceOptions,
                onChange: setResource,
            },
        ],
        groupBy: (row: { resource: string }) => row.resource,
        groupLabel: resourceLabel,
        noun: 'permissions',
        emptyMessage: 'There are no permissions yet.',
        emptyFilteredMessage: 'No permissions match your search or filters.',
    };

    const roleColumns: DataTableColumn<RoleListItem>[] = [
        {
            id: 'role',
            header: 'Role',
            wrap: true,
            cell: (role) => (
                <div className="min-w-48 space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                        {role.name}
                        {role.is_system && <SystemRoleBadge />}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {roleSummary(role)}
                    </p>
                </div>
            ),
        },
        {
            id: 'users',
            header: 'Users',
            cell: (role) =>
                `${role.users_count} ${plural(role.users_count, 'user')}`,
        },
        {
            id: 'permissions',
            header: 'Permissions',
            cell: (role) =>
                role.is_system
                    ? 'All permissions'
                    : `${role.permissions_count} ${plural(role.permissions_count, 'permission')}`,
        },
        {
            id: 'type',
            header: 'Type',
            visibleFrom: 'sm',
            cell: (role) =>
                role.is_system ? (
                    <SystemRoleBadge />
                ) : (
                    <Badge variant="secondary">Custom</Badge>
                ),
        },
        {
            id: 'created',
            header: 'Created',
            visibleFrom: 'md',
            className: 'text-muted-foreground',
            cell: (role) =>
                role.created_at
                    ? new Date(role.created_at).toLocaleDateString()
                    : '—',
        },
        {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            className: 'w-0',
            cell: (role) => (
                <RoleActions
                    role={role}
                    onDelete={() => {
                        setDeleteError(undefined);
                        setDeleting(role);
                    }}
                />
            ),
        },
    ];

    const matrixColumns: DataTableColumn<PermissionRow>[] = [
        {
            id: 'permission',
            header: 'Permission',
            className: 'min-w-44',
            cell: (row) => (
                <span title={row.name}>{permissionLabel(row.name)}</span>
            ),
        },
        ...(roles?.data ?? []).map<DataTableColumn<PermissionRow>>((role) => ({
            id: `role-${role.id}`,
            header: role.name,
            className: 'text-center',
            cell: (row) => {
                const has =
                    role.is_system || role.permissions.includes(row.name);

                return (
                    <Icon
                        iconNode={has ? Tick02Icon : Cancel01Icon}
                        className={
                            has
                                ? 'inline size-4 text-emerald-600 dark:text-emerald-400'
                                : 'text-muted-foreground/50 inline size-4'
                        }
                        aria-label={has ? 'Granted' : 'Not granted'}
                    />
                );
            },
        })),
    ];

    const permissionColumns: DataTableColumn<PermissionListItem>[] = [
        {
            id: 'permission',
            header: 'Permission',
            cell: (permission) => permissionLabel(permission.name),
        },
        {
            id: 'identifier',
            header: 'Identifier',
            visibleFrom: 'sm',
            cell: (permission) => (
                <code className="text-muted-foreground font-mono text-xs">
                    {permission.name}
                </code>
            ),
        },
        {
            id: 'roles',
            header: 'Roles',
            visibleFrom: 'md',
            wrap: true,
            cell: (permission) =>
                permission.roles.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                        {permission.roles.map((role) => (
                            <RoleBadge key={role} name={role} />
                        ))}
                    </div>
                ) : (
                    <span className="text-muted-foreground text-xs">None</span>
                ),
        },
        {
            id: 'users',
            header: 'Direct users',
            align: 'right',
            className: 'text-muted-foreground tabular-nums',
            cell: (permission) => permission.users_count,
        },
    ];

    return (
        <>
            <Head title="Roles & permissions" />

            <div className="p-4 md:p-6">
                {view === 'roles' && roles && (
                    <DataTable
                        key="roles"
                        {...tableProps}
                        url={RoleController.index.url()}
                        paginator={roles}
                        columns={roleColumns}
                        rowKey={(role) => role.id}
                        search={{
                            value: filters.search,
                            placeholder: 'Search roles',
                        }}
                        noun="roles"
                        emptyMessage="There are no roles yet."
                        emptyFilteredMessage="No roles match your search."
                    />
                )}

                {view === 'matrix' && roles && (
                    <DataTable
                        key="matrix"
                        {...tableProps}
                        {...localPermissionControls}
                        rows={matrixRows}
                        columns={matrixColumns}
                        rowKey={(row) => row.id}
                    />
                )}

                {view === 'permissions' && permissions && (
                    <DataTable
                        key="permissions"
                        {...tableProps}
                        {...localPermissionControls}
                        rows={permissionRows}
                        columns={permissionColumns}
                        rowKey={(row) => row.id}
                    />
                )}
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

/** Manage / view link and a delete menu, hidden when not allowed. */
function RoleActions({
    role,
    onDelete,
}: {
    role: RoleListItem;
    onDelete: () => void;
}) {
    const { can } = useAuthorization();
    const canEdit = can('roles.update');
    const manageable = role.can_manage && !role.is_system;
    const canDelete = can('roles.delete') && manageable;

    return (
        <div className="flex items-center justify-end gap-1">
            {canEdit && (
                <Button variant="outline" size="sm" asChild>
                    <Link href={RoleController.edit.url(String(role.id))}>
                        <Icon iconNode={manageable ? Edit02Icon : ViewIcon} />
                        <span className="hidden sm:inline">
                            {manageable
                                ? 'Manage permissions'
                                : 'View permissions'}
                        </span>
                        <span className="sr-only sm:hidden">
                            {manageable ? 'Manage' : 'View'} {role.name}
                        </span>
                    </Link>
                </Button>
            )}
            {canDelete && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="size-8"
                            aria-label={`Actions for ${role.name}`}
                        >
                            <Icon iconNode={MoreHorizontalIcon} />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem
                            variant="destructive"
                            onSelect={onDelete}
                        >
                            <Icon iconNode={Delete02Icon} />
                            Delete role
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

RolesPermissions.layout = () => ({
    breadcrumbs: [
        { title: 'Roles & permissions', href: RoleController.index() },
    ],
});
