import {
    Add01Icon,
    Cancel01Icon,
    Delete02Icon,
    Edit02Icon,
    Search01Icon,
    Tick02Icon,
} from '@hugeicons/core-free-icons';
import { Head, Link, router } from '@inertiajs/react';
import { Fragment, useMemo, useState } from 'react';
import RoleController from '@/actions/App/Http/Controllers/Admin/RoleController';
import {
    RoleBadge,
    SystemRoleBadge,
} from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import InputError from '@/components/input-error';
import { SimplePagination } from '@/components/simple-pagination';
import { Button } from '@/components/ui/button';
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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { useAuthorization } from '@/hooks/use-authorization';
import { useQueryFilters } from '@/hooks/use-query-filters';
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

const VIEW_LABELS: Record<View, string> = {
    roles: 'Roles',
    matrix: 'Matrix',
    permissions: 'Permissions',
};

const ALL_RESOURCES = '__all__';

/** Same action order as the matrix and role form (PermissionRegistry). */
const ACTION_ORDER = ['view', 'create', 'update', 'delete'];

function actionRank(action: string): number {
    const index = ACTION_ORDER.indexOf(action);

    return index === -1 ? ACTION_ORDER.length : index;
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
    const { filters: current, setFilter } = useQueryFilters(
        RoleController.index.url(),
        filters,
    );
    // Global search links here with ?permission=<name> to pre-fill the filter.
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

    const resources = useMemo(
        () =>
            [
                ...new Set((permissions ?? []).map((item) => item.resource)),
            ].sort(),
        [permissions],
    );
    const filteredPermissions = useMemo(() => {
        const needle = permissionSearch.trim().toLowerCase();

        return (permissions ?? []).filter(
            (item) =>
                (!resource || item.resource === resource) &&
                (!needle ||
                    item.name.includes(needle) ||
                    permissionLabel(item.name).toLowerCase().includes(needle)),
        );
    }, [permissions, permissionSearch, resource]);

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

    const changeView = (next: View) => {
        setView(next);

        const url = new URL(window.location.href);
        url.searchParams.set('view', next);
        window.history.replaceState(window.history.state, '', url);
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
                            permission of their roles; permissions are defined
                            in code by each feature.
                        </p>
                    </div>
                    {roles && can('roles.create') && (
                        <Button asChild>
                            <Link href={RoleController.create.url()}>
                                <Icon iconNode={Add01Icon} />
                                Create role
                            </Link>
                        </Button>
                    )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                    {view === 'permissions' ? (
                        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                            <SearchInput
                                value={permissionSearch}
                                onChange={setPermissionSearch}
                                placeholder="Search permissions"
                            />
                            <Select
                                value={resource ?? ALL_RESOURCES}
                                onValueChange={(value) =>
                                    setResource(
                                        value === ALL_RESOURCES ? null : value,
                                    )
                                }
                            >
                                <SelectTrigger
                                    className="sm:w-48"
                                    aria-label="Filter by resource"
                                >
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_RESOURCES}>
                                        All resources
                                    </SelectItem>
                                    {resources.map((item) => (
                                        <SelectItem key={item} value={item}>
                                            {resourceLabel(item)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    ) : (
                        <SearchInput
                            value={current.search}
                            onChange={(value) => setFilter('search', value)}
                            placeholder="Search roles"
                        />
                    )}

                    {views.length > 1 && (
                        <ToggleGroup
                            type="single"
                            variant="outline"
                            value={view}
                            onValueChange={(value) =>
                                value && changeView(value as View)
                            }
                            aria-label="View"
                        >
                            {views.map((item) => (
                                <ToggleGroupItem
                                    key={item}
                                    value={item}
                                    className="px-3"
                                >
                                    {VIEW_LABELS[item]}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    )}
                </div>

                {view === 'permissions' ? (
                    <PermissionsTable permissions={filteredPermissions} />
                ) : roles && roles.data.length === 0 ? (
                    <EmptyState>
                        {filters.search
                            ? 'No roles match your search.'
                            : 'There are no roles yet.'}
                    </EmptyState>
                ) : roles && view === 'roles' ? (
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                        {roles.data.map((role) => (
                            <RoleCard
                                key={role.id}
                                role={role}
                                onDelete={() => {
                                    setDeleteError(undefined);
                                    setDeleting(role);
                                }}
                            />
                        ))}
                    </div>
                ) : roles ? (
                    <PermissionMatrix
                        roles={roles.data}
                        groups={permissionGroups}
                    />
                ) : null}

                {roles && view !== 'permissions' && (
                    <SimplePagination paginator={roles} noun="roles" />
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

function SearchInput({
    value,
    onChange,
    placeholder,
}: {
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) {
    return (
        <div className="relative w-full sm:w-80">
            <Icon
                iconNode={Search01Icon}
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            />
            <Input
                type="search"
                value={value}
                onChange={(event) => onChange(event.target.value)}
                placeholder={placeholder}
                className="pl-9"
                aria-label={placeholder}
            />
        </div>
    );
}

function EmptyState({ children }: { children: React.ReactNode }) {
    return (
        <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-16 text-center text-sm">
            {children}
        </div>
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

function RoleCard({
    role,
    onDelete,
}: {
    role: RoleListItem;
    onDelete: () => void;
}) {
    const { can } = useAuthorization();

    return (
        <article className="bg-card flex flex-col gap-4 rounded-xl border p-5">
            <div className="space-y-1.5">
                <div className="flex items-center gap-2">
                    <h2 className="font-medium">{role.name}</h2>
                    {role.is_system && <SystemRoleBadge />}
                </div>
                <p className="text-muted-foreground text-sm">
                    {roleSummary(role)}
                </p>
            </div>

            <div className="text-muted-foreground flex gap-5 text-sm">
                <span>
                    <span className="text-foreground font-semibold tabular-nums">
                        {role.is_system ? 'All' : role.permissions_count}
                    </span>{' '}
                    {role.is_system
                        ? 'permissions'
                        : plural(role.permissions_count, 'permission')}
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
                        <Link href={RoleController.edit.url(String(role.id))}>
                            <Icon iconNode={Edit02Icon} />
                            {role.can_manage && !role.is_system
                                ? 'Manage permissions'
                                : 'View permissions'}
                        </Link>
                    </Button>
                ) : (
                    <span />
                )}
                {can('roles.delete') && !role.is_system && role.can_manage && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive-foreground hover:text-destructive-foreground"
                        aria-label={`Delete ${role.name}`}
                        onClick={onDelete}
                    >
                        <Icon iconNode={Delete02Icon} />
                    </Button>
                )}
            </div>
        </article>
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
                            <GroupHeaderRow
                                label={resourceLabel(group.resource)}
                                colSpan={roles.length + 1}
                            />
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

/** Every permission, grouped by resource, with who holds it. Read-only. */
function PermissionsTable({
    permissions,
}: {
    permissions: PermissionListItem[];
}) {
    if (permissions.length === 0) {
        return <EmptyState>No permissions match these filters.</EmptyState>;
    }

    const groups = [...permissions]
        .sort(
            (a, b) =>
                a.resource.localeCompare(b.resource) ||
                actionRank(a.action) - actionRank(b.action) ||
                a.action.localeCompare(b.action),
        )
        .reduce<Record<string, PermissionListItem[]>>((result, item) => {
            (result[item.resource] ??= []).push(item);

            return result;
        }, {});

    return (
        <div className="bg-card overflow-hidden rounded-xl border">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="text-sm">Permission</TableHead>
                        <TableHead className="hidden text-sm sm:table-cell">
                            Identifier
                        </TableHead>
                        <TableHead className="hidden text-sm md:table-cell">
                            Roles
                        </TableHead>
                        <TableHead className="text-right text-sm">
                            Direct users
                        </TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {Object.entries(groups).map(([resource, items]) => (
                        <Fragment key={resource}>
                            <GroupHeaderRow
                                label={resourceLabel(resource)}
                                colSpan={4}
                            />
                            {items.map((permission) => (
                                <TableRow key={permission.id}>
                                    <TableCell>
                                        {permissionLabel(permission.name)}
                                    </TableCell>
                                    <TableCell className="hidden sm:table-cell">
                                        <code className="text-muted-foreground font-mono text-xs">
                                            {permission.name}
                                        </code>
                                    </TableCell>
                                    <TableCell className="hidden whitespace-normal md:table-cell">
                                        <div className="flex flex-wrap gap-1">
                                            {permission.roles.length > 0 ? (
                                                permission.roles.map((role) => (
                                                    <RoleBadge
                                                        key={role}
                                                        name={role}
                                                    />
                                                ))
                                            ) : (
                                                <span className="text-muted-foreground text-xs">
                                                    None
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-right tabular-nums">
                                        {permission.users_count}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </Fragment>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function GroupHeaderRow({
    label,
    colSpan,
}: {
    label: string;
    colSpan: number;
}) {
    return (
        <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableCell
                colSpan={colSpan}
                className="text-muted-foreground py-2 text-xs font-medium tracking-wide uppercase"
            >
                {label}
            </TableCell>
        </TableRow>
    );
}

RolesPermissions.layout = () => ({
    breadcrumbs: [
        { title: 'Roles & permissions', href: RoleController.index() },
    ],
});
