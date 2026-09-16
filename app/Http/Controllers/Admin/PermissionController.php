<?php

namespace App\Http\Controllers\Admin;

use App\Authorization\PermissionRegistry;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;

class PermissionController extends Controller
{
    public const int PER_PAGE = 50;

    /**
     * List permissions with the roles using them and direct user counts.
     *
     * Read-only: permissions are defined in config/permissions.php and created
     * by `php artisan permissions:sync`, never from the UI.
     */
    public function index(Request $request): Response
    {
        $guard = PermissionRegistry::guard();
        $search = trim((string) $request->query('search', ''));

        $resources = Permission::query()
            ->where('guard_name', $guard)
            ->pluck('name')
            ->map(fn ($name) => PermissionRegistry::parse((string) $name)['resource'])
            ->unique()
            ->sort()
            ->values();

        $resource = $resources->contains($request->query('resource')) ? (string) $request->query('resource') : null;

        $permissions = Permission::query()
            ->with('roles:id,name')
            ->withCount('users')
            ->where('guard_name', $guard)
            ->when($search !== '', fn ($query) => $query->whereLike('name', "%{$search}%"))
            ->when($resource, fn ($query) => $query->whereLike('name', "{$resource}.%"))
            ->orderBy('name')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                ...PermissionRegistry::parse($permission->name),
                'roles' => $permission->roles->pluck('name')->sort()->values(),
                'users_count' => $permission->users_count,
            ]);

        return Inertia::render('admin/permissions/index', [
            'permissions' => $permissions,
            'resources' => $resources,
            'filters' => ['search' => $search, 'resource' => $resource],
        ]);
    }
}
