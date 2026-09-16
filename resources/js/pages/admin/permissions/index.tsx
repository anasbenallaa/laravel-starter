import {
    Add01Icon,
    Delete02Icon,
    Edit02Icon,
    Search01Icon,
} from '@hugeicons/core-free-icons';
import { Head, router, useForm } from '@inertiajs/react';
import { useState } from 'react';
import PermissionController from '@/actions/App/Http/Controllers/Admin/PermissionController';
import { RoleBadge } from '@/components/authorization/role-badge';
import { ConfirmDialog } from '@/components/confirm-dialog';
import Heading from '@/components/heading';
import InputError from '@/components/input-error';
import { SimplePagination } from '@/components/simple-pagination';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useAuthorization } from '@/hooks/use-authorization';
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
    const { can } = useAuthorization();
    const { filters: current, setFilter } = useQueryFilters(
        PermissionController.index.url(),
        filters,
    );
    const [formTarget, setFormTarget] = useState<
        PermissionListItem | 'new' | null
    >(null);
    const [deleting, setDeleting] = useState<PermissionListItem | null>(null);
    const [processing, setProcessing] = useState(false);
    const canEditOrDelete =
        can('permissions.update') || can('permissions.delete');

    return (
        <>
            <Head title="Permissions" />

            <div className="flex flex-col gap-6 p-4 md:p-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <Heading
                        title="Permissions"
                        description="Capabilities named resource.action that roles and users can be granted."
                    />
                    {can('permissions.create') && (
                        <Button onClick={() => setFormTarget('new')}>
                            <Icon iconNode={Add01Icon} />
                            New permission
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
                                    {canEditOrDelete && (
                                        <TableHead className="w-0">
                                            <span className="sr-only">
                                                Actions
                                            </span>
                                        </TableHead>
                                    )}
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
                                        {canEditOrDelete && (
                                            <TableCell>
                                                <div className="flex justify-end gap-1">
                                                    {can(
                                                        'permissions.update',
                                                    ) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8"
                                                            aria-label={`Edit ${permission.name}`}
                                                            onClick={() =>
                                                                setFormTarget(
                                                                    permission,
                                                                )
                                                            }
                                                        >
                                                            <Icon
                                                                iconNode={
                                                                    Edit02Icon
                                                                }
                                                            />
                                                        </Button>
                                                    )}
                                                    {can(
                                                        'permissions.delete',
                                                    ) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-destructive-foreground hover:text-destructive-foreground size-8"
                                                            aria-label={`Delete ${permission.name}`}
                                                            onClick={() =>
                                                                setDeleting(
                                                                    permission,
                                                                )
                                                            }
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
                                        )}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}

                <SimplePagination paginator={permissions} noun="permissions" />
            </div>

            {formTarget !== null && (
                <PermissionFormDialog
                    permission={formTarget === 'new' ? null : formTarget}
                    onClose={() => setFormTarget(null)}
                />
            )}

            <ConfirmDialog
                open={deleting !== null}
                onOpenChange={(open) => !open && setDeleting(null)}
                title={`Delete permission "${deleting?.name}"?`}
                confirmLabel="Delete permission"
                processing={processing}
                onConfirm={() =>
                    deleting &&
                    router.delete(
                        PermissionController.destroy.url(String(deleting.id)),
                        {
                            preserveScroll: true,
                            onStart: () => setProcessing(true),
                            onFinish: () => setProcessing(false),
                            onSuccess: () => setDeleting(null),
                        },
                    )
                }
            >
                {deleting && (
                    <>
                        <p className="text-foreground">
                            {deleting.roles.length > 0
                                ? `Used by ${deleting.roles.length === 1 ? 'role' : 'roles'}: ${deleting.roles.join(', ')}.`
                                : 'Not used by any role.'}{' '}
                            {deleting.users_count > 0
                                ? `Directly granted to ${deleting.users_count} ${deleting.users_count === 1 ? 'user' : 'users'}.`
                                : 'Not granted directly to any user.'}
                        </p>
                        <p>
                            Everyone loses this permission, and code that checks{' '}
                            <code className="font-mono">{deleting.name}</code>{' '}
                            will deny access.
                            {deleting.is_configured &&
                                ' It is defined in config/permissions.php, so it will be recreated (unassigned) the next time permissions are synced.'}
                        </p>
                        <p>This action cannot be undone.</p>
                    </>
                )}
            </ConfirmDialog>
        </>
    );
}

function PermissionFormDialog({
    permission,
    onClose,
}: {
    permission: PermissionListItem | null;
    onClose: () => void;
}) {
    const form = useForm({ name: permission?.name ?? '' });
    const renaming = permission !== null && form.data.name !== permission.name;

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        const options = { preserveScroll: true, onSuccess: onClose };

        if (permission) {
            form.put(
                PermissionController.update.url(String(permission.id)),
                options,
            );
        } else {
            form.post(PermissionController.store.url(), options);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <form onSubmit={submit} className="space-y-4">
                    <DialogHeader>
                        <DialogTitle>
                            {permission ? 'Edit permission' : 'New permission'}
                        </DialogTitle>
                        <DialogDescription>
                            Use the{' '}
                            <code className="font-mono">resource.action</code>{' '}
                            format, e.g.{' '}
                            <code className="font-mono">reports.export</code>.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-2">
                        <Label htmlFor="permission-name">Name</Label>
                        <Input
                            id="permission-name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData(
                                    'name',
                                    event.target.value.toLowerCase(),
                                )
                            }
                            placeholder="orders.approve"
                            className="font-mono"
                            autoComplete="off"
                            autoFocus
                            required
                        />
                        {form.data.name.includes('.') && !form.errors.name && (
                            <p className="text-muted-foreground text-xs">
                                Shown as “{permissionLabel(form.data.name)}”.
                            </p>
                        )}
                        <InputError message={form.errors.name} />
                    </div>

                    {renaming && (
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-300">
                            Changing a permission name may affect authorization
                            checks that reference this permission.
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <DialogClose asChild>
                            <Button type="button" variant="secondary">
                                Cancel
                            </Button>
                        </DialogClose>
                        <Button
                            type="submit"
                            disabled={form.processing || !form.isDirty}
                        >
                            {permission ? 'Save' : 'Create permission'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

PermissionsIndex.layout = () => ({
    breadcrumbs: [{ title: 'Permissions', href: PermissionController.index() }],
});
