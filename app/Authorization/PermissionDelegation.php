<?php

namespace App\Authorization;

use App\Models\User;
use Illuminate\Support\Collection;
use Spatie\Permission\Models\Role;

/**
 * Privilege-escalation rules for managing access.
 *
 * Admins may grant anything. Everyone else may only hand out (or take away)
 * permissions they hold themselves, and may only assign or manage roles whose
 * permissions they fully hold. The Admin role can only be granted or revoked
 * by an Admin.
 */
final class PermissionDelegation
{
    public function isUnrestricted(User $actor): bool
    {
        return SystemRole::isAdmin($actor);
    }

    /**
     * Permission names the actor may delegate, or null when unrestricted.
     *
     * @return array<int, string>|null
     */
    public function delegablePermissions(User $actor): ?array
    {
        if ($this->isUnrestricted($actor)) {
            return null;
        }

        return $actor->getAllPermissions()->pluck('name')->map(fn ($name) => (string) $name)->values()->all();
    }

    /**
     * The given permission names that the actor may NOT delegate.
     *
     * @param  iterable<string>  $names
     * @return array<int, string>
     */
    public function undelegable(User $actor, iterable $names): array
    {
        $delegable = $this->delegablePermissions($actor);

        if ($delegable === null) {
            return [];
        }

        return Collection::make($names)->diff($delegable)->values()->all();
    }

    /**
     * Whether the actor may assign, remove, edit or delete this role.
     */
    public function canManageRole(User $actor, Role $role): bool
    {
        if ($this->isUnrestricted($actor)) {
            return true;
        }

        if (SystemRole::isSystem($role)) {
            return false;
        }

        return $this->undelegable($actor, $role->permissions->pluck('name')->all()) === [];
    }
}
