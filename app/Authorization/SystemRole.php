<?php

namespace App\Authorization;

use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * The protected, built-in roles. Every other role is created and managed at
 * runtime, so it's deliberately not listed here.
 */
final class SystemRole
{
    /**
     * Super administrator: passes every Gate check (see AppServiceProvider),
     * can't be renamed, edited or deleted, and must always keep one member.
     */
    public const string ADMIN = 'Admin';

    public static function isSystem(Role|string $role): bool
    {
        return ($role instanceof Role ? $role->name : $role) === self::ADMIN;
    }

    public static function isAdmin(User $user): bool
    {
        return $user->hasRole(self::ADMIN);
    }

    /**
     * Whether removing Admin from this user (or deleting them) would leave the
     * application without any administrator.
     */
    public static function isLastAdmin(User $user): bool
    {
        return self::isAdmin($user)
            && User::query()->whereHas('roles', fn ($query) => $query->where('name', self::ADMIN))->count() <= 1;
    }
}
