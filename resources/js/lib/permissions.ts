/** Name of the protected super-admin role (App\Authorization\SystemRole::ADMIN). */
export const ADMIN_ROLE = 'Admin';

function humanize(value: string): string {
    return value.replace(/[_.]/g, ' ').trim();
}

function capitalize(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

/** "purchase_orders" → "Purchase orders" */
export function resourceLabel(resource: string): string {
    return capitalize(humanize(resource));
}

/** "view" → "View" */
export function actionLabel(action: string): string {
    return capitalize(humanize(action));
}

/**
 * Labels that don't read well from the generic "<action> <resource>" rule.
 * Add an entry here instead of hardcoding a label in a page.
 */
const permissionLabelOverrides: Record<string, string> = {
    'users.reset_password': 'Send password reset links',
};

/** "reports.export" → "Export reports", "activities.view.all" → "View all activities" */
export function permissionLabel(name: string): string {
    if (permissionLabelOverrides[name]) {
        return permissionLabelOverrides[name];
    }

    const [resource = '', ...action] = name.split('.');

    return capitalize(`${humanize(action.join(' '))} ${humanize(resource)}`);
}

/** Whether the current user may grant this permission (null = unrestricted). */
export function isDelegable(
    permission: string,
    delegable: string[] | null,
): boolean {
    return delegable === null || delegable.includes(permission);
}
