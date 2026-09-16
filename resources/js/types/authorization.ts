/** The signed-in user's access, shared on every Inertia response. */
export type AuthAuthorization = {
    /** Role names, e.g. ["Manager"]. */
    roles: string[];
    /** Effective permission names (roles + direct), e.g. ["users.view"]. */
    permissions: string[];
    /** Admins pass every check, mirroring the backend Gate::before. */
    isAdmin: boolean;
};

export type PermissionOption = {
    id: number;
    name: string;
    action: string;
};

/** Permissions grouped by the resource part of "resource.action". */
export type PermissionGroup = {
    resource: string;
    permissions: PermissionOption[];
};

/**
 * Permission names the current user may grant; null means unrestricted (Admin).
 */
export type DelegablePermissions = string[] | null;

export type RoleListItem = {
    id: number;
    name: string;
    is_system: boolean;
    users_count: number;
    permissions_count: number;
    permissions: string[];
    can_manage: boolean;
    created_at: string | null;
};

export type AssignableRole = {
    id: number;
    name: string;
    is_system: boolean;
    permissions: string[];
    assignable: boolean;
};

export type UserListItem = {
    id: number;
    name: string;
    email: string;
    avatar: string | null;
    roles: string[];
    permissions: string[];
    created_at: string | null;
};

export type PermissionListItem = {
    id: number;
    name: string;
    resource: string;
    action: string;
    roles: string[];
    users_count: number;
};
