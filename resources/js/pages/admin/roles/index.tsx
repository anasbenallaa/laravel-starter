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
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import {
    RoleBadge,
    SystemRoleBadge,
} from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import type { DataTableColumn } from '@/components/data-table/data-table';
import { DataTable } from '@/components/data-table/data-table';
import InputError from '@/components/input-error';
import { Ltr } from '@/components/ltr';
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
import { useFormatters } from '@/hooks/use-formatters';
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

/** Translation keys of the view tabs. */
const VIEW_LABELS: Record<View, string> = {
    roles: 'roles.view.roles',
    matrix: 'roles.view.matrix',
    permissions: 'roles.view.permissions',
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
    t: TFunction,
) {
    const needle = search.trim().toLowerCase();

    return (
        (!resource || row.resource === resource) &&
        (!needle ||
            row.name.includes(needle) ||
            permissionLabel(row.name, t).toLowerCase().includes(needle))
    );
}

/** One-line summary derived from what the role can actually access. */
function roleSummary(role: RoleListItem, t: TFunction, locale: string): string {
    if (role.is_system) {
        return t('roles.summary.full_access');
    }

    const resources = [
        ...new Set(role.permissions.map((name) => name.split('.')[0])),
    ].map((resource) => resourceLabel(resource, t));

    if (resources.length === 0) {
        return t('roles.summary.none');
    }

    // "A, B and C" / "A, B, C and 2 more", with the locale's separators.
    if (resources.length > 3) {
        return t('roles.summary.access_more', {
            resources: new Intl.ListFormat(locale, {
                style: 'short',
                type: 'unit',
            }).format(resources.slice(0, 3)),
            count: resources.length - 3,
        });
    }

    return t('roles.summary.access', {
        resources: new Intl.ListFormat(locale, {
            style: 'long',
            type: 'conjunction',
        }).format(resources),
    });
}

export default function RolesPermissions({
    roles,
    permissions,
    permissionGroups,
    filters,
}: Props) {
    const { can } = useAuthorization();
    const { t, i18n } = useTranslation();
    const { date, number } = useFormatters();
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
                    matchesPermission(row, permissionSearch, resource, t),
                )
                .sort(byResourceThenAction),
        [permissionGroups, permissionSearch, resource, t],
    );
    const permissionRows = useMemo(
        () =>
            (permissions ?? [])
                .filter((row) =>
                    matchesPermission(row, permissionSearch, resource, t),
                )
                .sort(byResourceThenAction),
        [permissions, permissionSearch, resource, t],
    );
    const resourceOptions = useMemo(
        () =>
            [...new Set(permissionGroups.map((group) => group.resource))]
                .sort()
                .map((value) => ({ value, label: resourceLabel(value, t) })),
        [permissionGroups, t],
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
        title: t('navigation.roles_permissions'),
        description: t('roles.index.description'),
        tabs: views.map((value) => ({ value, label: t(VIEW_LABELS[value]) })),
        activeTab: view,
        onTabChange: changeView,
        actions:
            roles && can('roles.create') ? (
                <Button asChild>
                    <Link href={RoleController.create.url()}>
                        <Icon iconNode={Add01Icon} />
                        <span className="hidden sm:inline">
                            {t('roles.create.title')}
                        </span>
                        <span className="sr-only sm:hidden">
                            {t('roles.create.title')}
                        </span>
                    </Link>
                </Button>
            ) : undefined,
    };

    const localPermissionControls = {
        search: {
            value: permissionSearch,
            placeholder: t('permissions.search'),
            onChange: setPermissionSearch,
        },
        filters: [
            {
                key: 'resource',
                label: t('permissions.filter_resource'),
                value: resource,
                allLabel: t('permissions.all_resources'),
                options: resourceOptions,
                onChange: setResource,
            },
        ],
        groupBy: (row: { resource: string }) => row.resource,
        groupLabel: (group: string) => resourceLabel(group, t),
        countLabel: (count: number) => t('permissions.count', { count }),
        emptyMessage: t('permissions.empty'),
        emptyFilteredMessage: t('permissions.empty_filtered'),
    };

    const roleColumns: DataTableColumn<RoleListItem>[] = [
        {
            id: 'role',
            header: t('roles.table.role'),
            wrap: true,
            cell: (role) => (
                <div className="min-w-48 space-y-0.5">
                    <div className="flex items-center gap-2 font-medium">
                        {role.name}
                        {role.is_system && <SystemRoleBadge />}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        {roleSummary(role, t, i18n.language)}
                    </p>
                </div>
            ),
        },
        {
            id: 'users',
            header: t('navigation.users'),
            cell: (role) => t('users.count', { count: role.users_count }),
        },
        {
            id: 'permissions',
            header: t('roles.view.permissions'),
            cell: (role) =>
                role.is_system
                    ? t('roles.all_permissions')
                    : t('permissions.count', { count: role.permissions_count }),
        },
        {
            id: 'type',
            header: t('roles.table.type'),
            visibleFrom: 'sm',
            cell: (role) =>
                role.is_system ? (
                    <SystemRoleBadge />
                ) : (
                    <Badge variant="secondary">{t('roles.custom')}</Badge>
                ),
        },
        {
            id: 'created',
            header: t('roles.table.created'),
            visibleFrom: 'md',
            className: 'text-muted-foreground',
            cell: (role) => (role.created_at ? date(role.created_at) : '—'),
        },
        {
            id: 'actions',
            header: <span className="sr-only">{t('common.actions')}</span>,
            align: 'end',
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
            header: t('permissions.table.permission'),
            className: 'min-w-44',
            cell: (row) => (
                <span title={row.name}>{permissionLabel(row.name, t)}</span>
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
                        aria-label={
                            has
                                ? t('permissions.granted')
                                : t('permissions.not_granted')
                        }
                    />
                );
            },
        })),
    ];

    const permissionColumns: DataTableColumn<PermissionListItem>[] = [
        {
            id: 'permission',
            header: t('permissions.table.permission'),
            cell: (permission) => permissionLabel(permission.name, t),
        },
        {
            id: 'identifier',
            header: t('permissions.table.identifier'),
            visibleFrom: 'sm',
            cell: (permission) => (
                <code className="text-muted-foreground font-mono text-xs">
                    <Ltr>{permission.name}</Ltr>
                </code>
            ),
        },
        {
            id: 'roles',
            header: t('roles.view.roles'),
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
                    <span className="text-muted-foreground text-xs">
                        {t('common.none')}
                    </span>
                ),
        },
        {
            id: 'users',
            header: t('permissions.table.direct_users'),
            align: 'end',
            className: 'text-muted-foreground tabular-nums',
            cell: (permission) => number(permission.users_count),
        },
    ];

    return (
        <>
            <Head title={t('navigation.roles_permissions')} />

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
                            placeholder: t('roles.index.search'),
                        }}
                        countLabel={(count) => t('roles.count', { count })}
                        emptyMessage={t('roles.empty')}
                        emptyFilteredMessage={t('roles.index.empty_filtered')}
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
                title={t('roles.delete.title', { name: deleting?.name })}
                confirmLabel={t('roles.actions.delete')}
                processing={processing}
                onConfirm={confirmDelete}
            >
                {deleting && deleting.users_count > 0 ? (
                    <p className="text-foreground font-medium">
                        {t('roles.delete.assigned', {
                            count: deleting.users_count,
                        })}
                    </p>
                ) : (
                    <p>{t('roles.delete.unassigned')}</p>
                )}
                <p>{t('common.cannot_be_undone')}</p>
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
    const { t } = useTranslation();
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
                                ? t('roles.actions.manage_permissions')
                                : t('roles.actions.view_permissions')}
                        </span>
                        <span className="sr-only sm:hidden">
                            {manageable
                                ? t('roles.actions.manage_role', {
                                      name: role.name,
                                  })
                                : t('roles.actions.view_role', {
                                      name: role.name,
                                  })}
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
                            aria-label={t('common.actions_for', {
                                name: role.name,
                            })}
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
                            {t('roles.actions.delete')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}

RolesPermissions.layout = () => ({
    breadcrumbs: [
        { title: 'navigation.roles_permissions', href: RoleController.index() },
    ],
});
