import { usePage } from '@inertiajs/react';
import { useMemo } from 'react';

export type UseAuthorizationReturn = {
    isAdmin: boolean;
    can: (permission: string) => boolean;
    canAny: (permissions: string[]) => boolean;
    canAll: (permissions: string[]) => boolean;
    hasRole: (role: string) => boolean;
};

/**
 * Permission checks for hiding UI the user can't use. This is UX only: the
 * backend authorizes every request independently.
 *
 *     const { can } = useAuthorization();
 *     can('users.update') && <Button>Edit</Button>
 */
export function useAuthorization(): UseAuthorizationReturn {
    const { roles, permissions, isAdmin } = usePage().props.auth;

    return useMemo(() => {
        const granted = new Set(permissions);
        const can = (permission: string) => isAdmin || granted.has(permission);

        return {
            isAdmin,
            can,
            canAny: (list) => list.some(can),
            canAll: (list) => list.every(can),
            hasRole: (role) => roles.includes(role),
        };
    }, [roles, permissions, isAdmin]);
}
