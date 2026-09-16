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

/** "reports.export" → "Export reports", "activities.view.all" → "View all activities" */
export function permissionLabel(name: string): string {
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
