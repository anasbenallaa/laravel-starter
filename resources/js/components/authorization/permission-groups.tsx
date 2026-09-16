import { Checkbox } from '@/components/ui/checkbox';
import { isDelegable, permissionLabel, resourceLabel } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import type { DelegablePermissions, PermissionGroup } from '@/types';

type Props = {
    groups: PermissionGroup[];
    selected: string[];
    onChange?: (selected: string[]) => void;
    /** Permissions the current user may grant; others are shown disabled. */
    delegable?: DelegablePermissions;
    readOnly?: boolean;
    idPrefix?: string;
};

/**
 * Permission checkboxes grouped by resource, one card per resource with a
 * "Select all / Deselect all" toggle.
 */
export function PermissionGroups({
    groups,
    selected,
    onChange,
    delegable = null,
    readOnly = false,
    idPrefix = 'permission',
}: Props) {
    const selectedSet = new Set(selected);

    const toggle = (names: string[], checked: boolean) => {
        const next = new Set(selectedSet);

        for (const name of names) {
            if (checked) {
                next.add(name);
            } else {
                next.delete(name);
            }
        }

        onChange?.([...next].sort());
    };

    if (groups.length === 0) {
        return (
            <p className="text-muted-foreground text-sm">
                No permissions have been created yet.
            </p>
        );
    }

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            {groups.map((group) => {
                const editable = readOnly
                    ? []
                    : group.permissions
                          .map((permission) => permission.name)
                          .filter((name) => isDelegable(name, delegable));
                const checkedCount = group.permissions.filter((permission) =>
                    selectedSet.has(permission.name),
                ).length;
                const allEditableChecked =
                    editable.length > 0 &&
                    editable.every((name) => selectedSet.has(name));

                return (
                    <fieldset
                        key={group.resource}
                        aria-label={`${resourceLabel(group.resource)} permissions`}
                        className="bg-card rounded-xl border"
                    >
                        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
                            <div className="flex items-center gap-2 text-sm font-semibold">
                                {resourceLabel(group.resource)}
                                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-xs font-medium tabular-nums">
                                    {checkedCount}/{group.permissions.length}
                                </span>
                            </div>
                            {editable.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        toggle(editable, !allEditableChecked)
                                    }
                                    className="hover:bg-accent rounded-md px-2 py-1 text-sm font-medium transition-colors"
                                >
                                    {allEditableChecked
                                        ? 'Deselect all'
                                        : 'Select all'}
                                </button>
                            )}
                        </div>

                        <div className="grid gap-x-6 gap-y-1 p-4 sm:grid-cols-2">
                            {group.permissions.map((permission) => {
                                const id = `${idPrefix}-${permission.name}`;
                                const disabled =
                                    readOnly ||
                                    !isDelegable(permission.name, delegable);

                                return (
                                    <label
                                        key={permission.id}
                                        htmlFor={id}
                                        title={
                                            !readOnly && disabled
                                                ? 'You can only grant permissions you have.'
                                                : permission.name
                                        }
                                        className={cn(
                                            'flex items-center gap-2.5 rounded-md py-1.5 text-sm',
                                            disabled
                                                ? 'cursor-not-allowed'
                                                : 'cursor-pointer',
                                            disabled &&
                                                !readOnly &&
                                                'text-muted-foreground',
                                        )}
                                    >
                                        <Checkbox
                                            id={id}
                                            checked={selectedSet.has(
                                                permission.name,
                                            )}
                                            disabled={disabled}
                                            onCheckedChange={(checked) =>
                                                toggle(
                                                    [permission.name],
                                                    checked === true,
                                                )
                                            }
                                        />
                                        {permissionLabel(permission.name)}
                                    </label>
                                );
                            })}
                        </div>
                    </fieldset>
                );
            })}
        </div>
    );
}
