import { useForm } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import { PermissionGroups } from '@/components/authorization/permission-groups';
import { SystemRoleBadge } from '@/components/authorization/role-badge';
import { FormSection } from '@/components/form-section';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UnsavedChangesBar } from '@/components/unsaved-changes-bar';
import { isDelegable } from '@/lib/permissions';
import type { DelegablePermissions, PermissionGroup } from '@/types';

type Props = {
    /** Wayfinder route definition the form submits to. */
    action?: { url: string; method: 'post' | 'put' };
    permissionGroups: PermissionGroup[];
    delegablePermissions: DelegablePermissions;
    initialName?: string;
    initialPermissions?: string[];
    submitLabel?: string;
    /** Show everything disabled with no save button. */
    readOnly?: boolean;
    isSystem?: boolean;
    /** Explanation shown under the name when the form is read-only. */
    notice?: string;
};

export function RoleForm({
    action,
    permissionGroups,
    delegablePermissions,
    initialName = '',
    initialPermissions = [],
    submitLabel,
    readOnly = false,
    isSystem = false,
    notice,
}: Props) {
    const { t } = useTranslation();
    const form = useForm<{
        name: string;
        permissions: string[];
        role?: string;
    }>({
        name: initialName,
        permissions: initialPermissions,
    });

    const allNames = permissionGroups.flatMap((group) =>
        group.permissions.map((permission) => permission.name),
    );
    const grantable = readOnly
        ? []
        : allNames.filter((name) => isDelegable(name, delegablePermissions));

    const setAll = (checked: boolean) => {
        const kept = form.data.permissions.filter(
            (name) => !grantable.includes(name),
        );

        form.setData(
            'permissions',
            checked ? [...new Set([...kept, ...grantable])].sort() : kept,
        );
    };

    const submit = (event: React.FormEvent) => {
        event.preventDefault();

        if (action && !readOnly) {
            form.submit(action.method, action.url, { preserveScroll: true });
        }
    };

    return (
        <form onSubmit={submit} className="space-y-6 md:pb-24">
            {form.errors.role && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-300">
                    {form.errors.role}
                </div>
            )}

            <FormSection
                title={t('roles.form.details_title')}
                description={t('roles.form.details_description')}
            >
                <div className="grid gap-2 md:max-w-xl">
                    <Label htmlFor="name">
                        {t('roles.form.name')}
                        {!readOnly && ' *'}
                    </Label>
                    <div className="flex items-center gap-2">
                        <Input
                            id="name"
                            value={form.data.name}
                            onChange={(event) =>
                                form.setData('name', event.target.value)
                            }
                            placeholder={t('roles.form.name_placeholder')}
                            autoComplete="off"
                            maxLength={100}
                            required
                            autoFocus={!readOnly}
                            disabled={readOnly}
                        />
                        {isSystem && <SystemRoleBadge />}
                    </div>
                    {notice && (
                        <p className="text-muted-foreground text-xs">
                            {notice}
                        </p>
                    )}
                    <InputError message={form.errors.name} />
                </div>
            </FormSection>

            <FormSection
                title={t('roles.form.permissions_title')}
                description={t('roles.form.permissions_description')}
            >
                <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-sm font-semibold tabular-nums">
                            {t('roles.form.selected', {
                                selected: form.data.permissions.length,
                                count: allNames.length,
                            })}
                            {!readOnly && delegablePermissions !== null && (
                                <span className="text-muted-foreground font-normal">
                                    {' · '}
                                    {t('permissions.only_grant_own')}
                                </span>
                            )}
                        </p>
                        {!readOnly && (
                            <div className="flex gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAll(true)}
                                    disabled={grantable.length === 0}
                                >
                                    {t('permissions.select_all')}
                                </Button>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    onClick={() => setAll(false)}
                                >
                                    {t('permissions.deselect_all')}
                                </Button>
                            </div>
                        )}
                    </div>

                    <PermissionGroups
                        groups={permissionGroups}
                        selected={form.data.permissions}
                        onChange={(permissions) =>
                            form.setData('permissions', permissions)
                        }
                        delegable={delegablePermissions}
                        readOnly={readOnly}
                    />
                    <InputError message={form.errors.permissions} />
                </div>
            </FormSection>

            {!readOnly && (
                <UnsavedChangesBar
                    visible={form.isDirty}
                    processing={form.processing}
                    saveLabel={submitLabel ?? t('common.save')}
                    onReset={() => {
                        form.reset();
                        form.clearErrors();
                    }}
                />
            )}
        </form>
    );
}
