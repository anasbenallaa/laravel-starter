<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Authorization\LogAccessChanges;
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
     * The combined roles & permissions page. Open to anyone who can view roles
     * or permissions; each section's data is only sent when permitted.
     */
    public function index(Request $request): Response
    {
        $actor = $request->user();

        abort_unless($actor->canAny(['roles.view', 'permissions.view']), 403);

        $search = trim((string) $request->query('search', ''));
        $canViewRoles = $actor->can('roles.view');
        $canViewPermissions = $actor->can('permissions.view');

        $roles = ! $canViewRoles ? null : Role::query()
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
                'permissions' => $role->permissions->pluck('name')->sort()->values(),
                'can_manage' => $this->delegation->canManageRole($actor, $role),
                'created_at' => $role->created_at?->toIso8601String(),
            ]);

        // Permissions are defined in code and few in number, so the whole
        // list is sent and filtered in the browser.
        $permissions = ! $canViewPermissions ? null : Permission::query()
            ->with('roles:id,name')
            ->withCount('users')
            ->where('guard_name', PermissionRegistry::guard())
            ->orderBy('name')
            ->get()
            ->map(fn (Permission $permission) => [
                'id' => $permission->id,
                'name' => $permission->name,
                ...PermissionRegistry::parse($permission->name),
                'roles' => $permission->roles->pluck('name')->sort()->values(),
                'users_count' => $permission->users_count,
            ]);

        return Inertia::render('admin/roles/index', [
            'roles' => $roles,
            'permissions' => $permissions,
            'permissionGroups' => $this->permissionGroups(),
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
    public function store(StoreRoleRequest $request, LogAccessChanges $log): RedirectResponse
    {
        DB::transaction(function () use ($request, $log) {
            /** @var Role $role */
            $role = Role::create([
                'name' => $request->validated('name'),
                'guard_name' => PermissionRegistry::guard(),
            ]);

            $role->syncPermissions($request->validated('permissions'));

            $log->roleCreated($role);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.role_created')]);

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
    public function update(UpdateRoleRequest $request, Role $role, LogAccessChanges $log): RedirectResponse
    {
        DB::transaction(function () use ($request, $role, $log) {
            $nameBefore = $role->name;
            $permissionsBefore = $role->permissions()->pluck('name')->all();

            $role->update(['name' => $request->validated('name')]);
            $role->syncPermissions($request->validated('permissions'));

            $log->roleUpdated($role, $nameBefore, $permissionsBefore);
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.role_updated')]);

        return to_route('admin.roles.index');
    }

    /**
     * Delete a custom role; its users lose the permissions it granted.
     */
    public function destroy(Request $request, Role $role, LogAccessChanges $log): RedirectResponse
    {
        if (SystemRole::isSystem($role)) {
            throw ValidationException::withMessages(['role' => __('errors.roles.admin_undeletable')]);
        }

        if (! $this->delegation->canManageRole($request->user(), $role)) {
            throw ValidationException::withMessages(['role' => __('errors.roles.delete_requires_permissions')]);
        }

        DB::transaction(function () use ($role, $log) {
            $log->roleDeleted($role, $role->users()->count());
            $role->delete();
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.role_deleted')]);

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
