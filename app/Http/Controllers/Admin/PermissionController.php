<?php

namespace App\Http\Controllers\Admin;

use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StorePermissionRequest;
use App\Http\Requests\Admin\UpdatePermissionRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionController extends Controller
{
    public const int PER_PAGE = 50;

    /**
     * List permissions with the roles using them and direct user counts.
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
        $configured = PermissionRegistry::configured();

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
                'is_configured' => in_array($permission->name, $configured, true),
            ]);

        return Inertia::render('admin/permissions/index', [
            'permissions' => $permissions,
            'resources' => $resources,
            'filters' => ['search' => $search, 'resource' => $resource],
        ]);
    }

    /**
     * Create a permission and grant it to the Admin role.
     */
    public function store(StorePermissionRequest $request): RedirectResponse
    {
        $permission = Permission::create([
            'name' => $request->validated('name'),
            'guard_name' => PermissionRegistry::guard(),
        ]);

        Role::query()
            ->where('guard_name', PermissionRegistry::guard())
            ->where('name', SystemRole::ADMIN)
            ->first()
            ?->givePermissionTo($permission);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Permission created successfully.')]);

        return back();
    }

    /**
     * Rename a permission.
     */
    public function update(UpdatePermissionRequest $request, Permission $permission): RedirectResponse
    {
        $permission->update(['name' => $request->validated('name')]);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Permission updated successfully.')]);

        return back();
    }

    /**
     * Delete a permission; it's removed from every role and user.
     */
    public function destroy(Permission $permission): RedirectResponse
    {
        $permission->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Permission deleted successfully.')]);

        return back();
    }
}
