<?php

namespace App\Http\Controllers\Admin;

use App\Authorization\PermissionDelegation;
use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreRoleRequest;
use App\Http\Requests\Admin\UpdateRoleRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public const int PER_PAGE = 20;

    public function __construct(private PermissionDelegation $delegation) {}

    /**
     * List roles with user and permission counts.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));
        $actor = $request->user();

        $roles = Role::query()
            ->with('permissions:id,name')
            ->withCount(['users', 'permissions'])
            ->where('guard_name', PermissionRegistry::guard())
            ->when($search !== '', fn ($query) => $query->whereLike('name', "%{$search}%"))
            ->orderByRaw('case when name = ? then 0 else 1 end', [SystemRole::ADMIN])
            ->orderBy('name')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'is_system' => SystemRole::isSystem($role),
                'users_count' => $role->users_count,
                'permissions_count' => $role->permissions_count,
                'can_manage' => $this->delegation->canManageRole($actor, $role),
                'created_at' => $role->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'filters' => ['search' => $search],
        ]);
    }

    /**
     * Show the create role form.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('admin/roles/create', [
            'permissionGroups' => $this->permissionGroups(),
            'delegablePermissions' => $this->delegation->delegablePermissions($request->user()),
        ]);
    }

    /**
     * Create a role and grant it the selected permissions.
     */
    public function store(StoreRoleRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $role = Role::create([
                'name' => $request->validated('name'),
                'guard_name' => PermissionRegistry::guard(),
            ]);

            $role->syncPermissions($request->validated('permissions'));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role created successfully.')]);

        return to_route('admin.roles.index');
    }

    /**
     * Show the edit role form. The Admin role is shown read-only.
     */
    public function edit(Request $request, Role $role): Response
    {
        $role->loadCount('users');

        return Inertia::render('admin/roles/edit', [
            'role' => [
                'id' => $role->id,
                'name' => $role->name,
                'is_system' => SystemRole::isSystem($role),
                'users_count' => $role->users_count,
                'permissions' => $role->permissions()->pluck('name')->sort()->values(),
            ],
            'canManage' => ! SystemRole::isSystem($role) && $this->delegation->canManageRole($request->user(), $role),
            'permissionGroups' => $this->permissionGroups(),
            'delegablePermissions' => $this->delegation->delegablePermissions($request->user()),
        ]);
    }

    /**
     * Rename a role and synchronize its permissions.
     */
    public function update(UpdateRoleRequest $request, Role $role): RedirectResponse
    {
        DB::transaction(function () use ($request, $role) {
            $role->update(['name' => $request->validated('name')]);
            $role->syncPermissions($request->validated('permissions'));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role updated successfully.')]);

        return to_route('admin.roles.index');
    }

    /**
     * Delete a custom role; its users lose the permissions it granted.
     */
    public function destroy(Request $request, Role $role): RedirectResponse
    {
        if (SystemRole::isSystem($role)) {
            throw ValidationException::withMessages(['role' => __('The Admin role cannot be deleted.')]);
        }

        if (! $this->delegation->canManageRole($request->user(), $role)) {
            throw ValidationException::withMessages(['role' => __('You can only delete roles whose permissions you have.')]);
        }

        $role->delete();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('Role deleted successfully.')]);

        return to_route('admin.roles.index');
    }

    /**
     * @return array<int, array{resource: string, permissions: array<int, array{id: int, name: string, action: string}>}>
     */
    private function permissionGroups(): array
    {
        return PermissionRegistry::group(
            Permission::query()->where('guard_name', PermissionRegistry::guard())->orderBy('name')->get(),
        );
    }
}
