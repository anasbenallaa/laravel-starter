import { Search01Icon } from '@hugeicons/core-free-icons';
import { Head } from '@inertiajs/react';
import PermissionController from '@/actions/App/Http/Controllers/Admin/PermissionController';
import { RoleBadge } from '@/components/authorization/role-badge';
import Heading from '@/components/heading';
import { SimplePagination } from '@/components/simple-pagination';
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
import { useQueryFilters } from '@/hooks/use-query-filters';
import { permissionLabel, resourceLabel } from '@/lib/permissions';
import type { Paginator, PermissionListItem } from '@/types';

type Props = {
    permissions: Paginator<PermissionListItem>;
    resources: string[];
    filters: { search: string; resource: string | null };
};

const ALL_RESOURCES = '__all__';

export default function PermissionsIndex({
    permissions,
    resources,
    filters,
}: Props) {
    const { filters: current, setFilter } = useQueryFilters(
        PermissionController.index.url(),
        filters,
    );

    return (
        <>
            <Head title="Permissions" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <Heading
                    title="Permissions"
                    description="Capabilities named resource.action that roles and users can be granted. Each feature defines its permissions in code, so they can't be created or changed here."
                />

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
                            placeholder="Search permissions"
                            className="pl-9"
                            aria-label="Search permissions"
                        />
                    </div>
                    <Select
                        value={current.resource ?? ALL_RESOURCES}
                        onValueChange={(value) =>
                            setFilter(
                                'resource',
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
                            {resources.map((resource) => (
                                <SelectItem key={resource} value={resource}>
                                    {resourceLabel(resource)}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {permissions.data.length === 0 ? (
                    <div className="text-muted-foreground rounded-xl border border-dashed px-6 py-16 text-center text-sm">
                        {filters.search || filters.resource
                            ? 'No permissions match these filters.'
                            : 'There are no permissions yet.'}
                    </div>
                ) : (
                    <div className="rounded-xl border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Permission</TableHead>
                                    <TableHead className="hidden sm:table-cell">
                                        Resource
                                    </TableHead>
                                    <TableHead className="hidden sm:table-cell">
                                        Action
                                    </TableHead>
                                    <TableHead className="hidden md:table-cell">
                                        Roles
                                    </TableHead>
                                    <TableHead className="hidden lg:table-cell">
                                        Direct users
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {permissions.data.map((permission) => (
                                    <TableRow key={permission.id}>
                                        <TableCell>
                                            <code className="font-mono text-xs font-medium">
                                                {permission.name}
                                            </code>
                                            <p className="text-muted-foreground text-xs">
                                                {permissionLabel(
                                                    permission.name,
                                                )}
                                            </p>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            {resourceLabel(permission.resource)}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell">
                                            {permission.action}
                                        </TableCell>
                                        <TableCell className="hidden whitespace-normal md:table-cell">
                                            <div className="flex max-w-xs flex-wrap gap-1">
                                                {permission.roles.length > 0 ? (
                                                    permission.roles.map(
                                                        (role) => (
                                                            <RoleBadge
                                                                key={role}
                                                                name={role}
                                                            />
                                                        ),
                                                    )
                                                ) : (
                                                    <span className="text-muted-foreground text-xs">
                                                        None
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                                            {permission.users_count}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <SimplePagination paginator={permissions} noun="permissions" />
            </div>
        </>
    );
}

PermissionsIndex.layout = () => ({
    breadcrumbs: [{ title: 'Permissions', href: PermissionController.index() }],
});
