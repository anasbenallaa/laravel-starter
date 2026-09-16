<?php

namespace App\Http\Controllers\Admin;

use App\Authorization\PermissionRegistry;
use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public const int PER_PAGE = 20;

    /**
     * List users with their roles and direct permissions.
     */
    public function index(Request $request): Response
    {
        $search = trim((string) $request->query('search', ''));

        $roles = Role::query()
            ->where('guard_name', PermissionRegistry::guard())
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name) => (string) $name);

        $role = $roles->contains($request->query('role')) ? (string) $request->query('role') : null;

        $users = User::query()
            ->with(['roles:id,name', 'permissions:id,name'])
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('email', "%{$search}%")))
            ->when($role, fn ($query) => $query->whereHas('roles', fn ($query) => $query->where('name', $role)))
            ->orderBy('name')
            ->paginate(self::PER_PAGE)
            ->withQueryString()
            ->through(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'roles' => $user->roles->pluck('name')->sort()->values(),
                'permissions' => $user->permissions->pluck('name')->sort()->values(),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => $roles->values(),
            'filters' => ['search' => $search, 'role' => $role],
        ]);
    }
}
