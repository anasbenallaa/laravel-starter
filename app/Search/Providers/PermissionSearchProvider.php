<?php

namespace App\Search\Providers;

use App\Authorization\PermissionRegistry;
use App\Models\User;
use App\Search\SearchProvider;
use App\Search\SearchResult;
use Spatie\Permission\Models\Permission;

class PermissionSearchProvider implements SearchProvider
{
    public function key(): string
    {
        return 'permissions';
    }

    public function label(): string
    {
        return __('search.group.permissions');
    }

    public function permission(): string
    {
        return 'permissions.view';
    }

    public function search(User $user, string $term, int $limit): array
    {
        return Permission::query()
            ->withCount('roles')
            ->where('guard_name', PermissionRegistry::guard())
            ->whereLike('name', "%{$term}%")
            ->orderBy('name')
            ->limit($limit)
            ->get()
            ->map(fn (Permission $permission) => new SearchResult(
                id: "permission-{$permission->id}",
                title: (string) $permission->name,
                description: __('permissions.label.'.$permission->name).' · '.trans_choice('search.result.used_by_roles', $permission->roles_count),
                href: route('admin.roles.index', ['view' => 'permissions', 'permission' => $permission->name], absolute: false),
                icon: 'permission',
            ))
            ->values()
            ->all();
    }
}
