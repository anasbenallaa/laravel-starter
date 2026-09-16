<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Authorization\LogAccessChanges;
use App\Authorization\PermissionDelegation;
use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\UpdateUserAccessRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class UserAccessController extends Controller
{
    public function __construct(private PermissionDelegation $delegation) {}

    /**
     * Show the roles and direct permissions editor for a user.
     */
    public function edit(Request $request, User $user): Response
    {
        $actor = $request->user();
        $guard = PermissionRegistry::guard();

        $roles = Role::query()
            ->with('permissions:id,name')
            ->where('guard_name', $guard)
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => $role->id,
                'name' => $role->name,
                'is_system' => SystemRole::isSystem($role),
                'permissions' => $role->permissions->pluck('name')->sort()->values(),
                'assignable' => $this->delegation->canManageRole($actor, $role),
            ]);

        return Inertia::render('admin/users/access', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
            ],
            'roles' => $roles,
            'permissionGroups' => PermissionRegistry::group(
                Permission::query()->where('guard_name', $guard)->orderBy('name')->get(),
            ),
            'assigned' => [
                'roles' => $user->getRoleNames()->values(),
                'permissions' => $user->getDirectPermissions()->pluck('name')->sort()->values(),
            ],
            'effectivePermissions' => $user->getAllPermissions()->pluck('name')->sort()->values(),
            'delegablePermissions' => $this->delegation->delegablePermissions($actor),
            'isLastAdmin' => SystemRole::isLastAdmin($user),
        ]);
    }

    /**
     * Replace the user's roles and direct permissions in one transaction.
     */
    public function update(UpdateUserAccessRequest $request, User $user, LogAccessChanges $log): RedirectResponse
    {
        DB::transaction(function () use ($request, $user, $log) {
            $rolesBefore = $user->getRoleNames()->all();
            $permissionsBefore = $user->getDirectPermissions()->pluck('name')->all();

            $user->syncRoles($request->validated('roles'));
            $user->syncPermissions($request->validated('permissions'));

            $log->userRoles($user, $rolesBefore, (array) $request->validated('roles'));
            $log->userPermissions($user, $permissionsBefore, (array) $request->validated('permissions'));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.user_access_updated')]);

        return to_route('admin.users.access.edit', $user);
    }
}
