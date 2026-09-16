<?php

namespace App\Search\Providers;

use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Models\User;
use App\Search\SearchProvider;
use App\Search\SearchResult;
use Spatie\Permission\Models\Role;

class RoleSearchProvider implements SearchProvider
{
    public function key(): string
    {
        return 'roles';
    }

    public function label(): string
    {
        return 'Roles';
    }

    public function permission(): string
    {
        return 'roles.view';
    }

    public function search(User $user, string $term, int $limit): array
    {
        $canEdit = $user->can('roles.update');

        return Role::query()
            ->withCount(['users', 'permissions'])
            ->where('guard_name', PermissionRegistry::guard())
            ->whereLike('name', "%{$term}%")
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Role $role) => new SearchResult(
                id: "role-{$role->id}",
                title: (string) $role->name,
                description: SystemRole::isSystem($role)
                    ? "System role · all permissions · {$role->users_count} ".str('user')->plural($role->users_count)
                    : "{$role->permissions_count} ".str('permission')->plural($role->permissions_count)
                        ." · {$role->users_count} ".str('user')->plural($role->users_count),
                href: $canEdit
                    ? route('admin.roles.edit', $role, absolute: false)
                    : route('admin.roles.index', ['search' => $role->name], absolute: false),
                icon: 'role',
            ))
            ->values()
            ->all();
    }
}
