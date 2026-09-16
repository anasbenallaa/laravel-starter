import { Checkbox } from '@/components/ui/checkbox';
import {
    actionLabel,
    isDelegable,
    permissionLabel,
    resourceLabel,
} from '@/lib/permissions';
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
 * Permission checkboxes grouped by resource, with "select all" per group.
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
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
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
                const groupId = `${idPrefix}-group-${group.resource}`;

                return (
                    <fieldset
                        key={group.resource}
                        className="rounded-lg border p-3"
                    >
                        <div className="mb-2 flex items-center justify-between gap-2">
                            <legend className="text-sm font-semibold">
                                {resourceLabel(group.resource)}
                                <span className="text-muted-foreground ml-1.5 text-xs font-normal">
                                    {checkedCount}/{group.permissions.length}
                                </span>
                            </legend>
                            {editable.length > 0 && (
                                <label
                                    htmlFor={groupId}
                                    className="text-muted-foreground flex cursor-pointer items-center gap-1.5 text-xs"
                                >
                                    <Checkbox
                                        id={groupId}
                                        checked={
                                            allEditableChecked
                                                ? true
                                                : editable.some((name) =>
                                                        selectedSet.has(name),
                                                    )
                                                  ? 'indeterminate'
                                                  : false
                                        }
                                        onCheckedChange={(checked) =>
                                            toggle(editable, checked === true)
                                        }
                                        aria-label={`Select all ${resourceLabel(group.resource)} permissions`}
                                    />
                                    Select all
                                </label>
                            )}
                        </div>

                        <div className="space-y-1">
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
                                                : permissionLabel(
                                                      permission.name,
                                                  )
                                        }
                                        className={cn(
                                            'hover:bg-accent/50 flex items-center gap-2 rounded-md px-1.5 py-1 text-sm',
                                            disabled
                                                ? 'cursor-not-allowed'
                                                : 'cursor-pointer',
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
                                        <span
                                            className={cn(
                                                'flex-1',
                                                disabled &&
                                                    !readOnly &&
                                                    'text-muted-foreground',
                                            )}
                                        >
                                            {actionLabel(permission.action)}
                                        </span>
                                        <code className="text-muted-foreground hidden font-mono text-[11px] sm:inline">
                                            {permission.name}
                                        </code>
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
