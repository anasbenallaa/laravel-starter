import type { TFunction } from 'i18next';

/** Name of the protected super-admin role (App\Authorization\SystemRole::ADMIN). */
export const ADMIN_ROLE = 'Admin';

function humanize(value: string): string {
    return value.replace(/[_.]/g, ' ').trim();
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * "purchase_orders" → "Purchase orders". Translated from
 * `permissions.resource.{resource}` (identifiers themselves never change).
 */
export function resourceLabel(resource: string, t: TFunction): string {
    return t(`permissions.resource.${resource}`, {
        defaultValue: capitalize(humanize(resource)),
    });
}

/**
 * "reports.export" → "Export reports". Translated from
 * `permissions.label.{name}`; every permission in config/permissions.php must
 * have one (enforced by TranslationFilesTest). The English fallback reads
 * "<action> <resource>".
 */
export function permissionLabel(name: string, t: TFunction): string {
    const [resource = '', ...action] = name.split('.');

    return t(`permissions.label.${name}`, {
        defaultValue: capitalize(
            `${humanize(action.join(' '))} ${humanize(resource)}`,
        ),
    });
}

/** Whether the current user may grant this permission (null = unrestricted). */
export function isDelegable(
    permission: string,
    delegable: string[] | null,
): boolean {
    return delegable === null || delegable.includes(permission);
}
