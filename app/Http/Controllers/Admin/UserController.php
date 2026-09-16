<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Users\DeleteUser;
use App\Authorization\PermissionDelegation;
use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Spatie\Permission\Models\Role;

class UserController extends Controller
{
    public const int PER_PAGE = 20;

    public function __construct(private PermissionDelegation $delegation) {}

    /**
     * List users with their roles and direct permissions.
     */
    public function index(Request $request): Response
    {
        $actor = $request->user();
        $search = trim((string) $request->query('search', ''));

        $roles = Role::query()
            ->where('guard_name', PermissionRegistry::guard())
            ->orderBy('name')
            ->pluck('name')
            ->map(fn ($name) => (string) $name);

        $role = $roles->contains($request->query('role')) ? (string) $request->query('role') : null;

        $users = User::query()
            // roles.permissions lets canManageUser() work without extra queries.
            ->with(['roles:id,name', 'roles.permissions:id,name', 'permissions:id,name'])
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
                'is_self' => $user->is($actor),
                'can_manage' => $this->delegation->canManageUser($actor, $user),
                'created_at' => $user->created_at?->toIso8601String(),
            ]);

        return Inertia::render('admin/users/index', [
            'users' => $users,
            'roles' => $roles->values(),
            'filters' => ['search' => $search, 'role' => $role],
        ]);
    }

    /**
     * Show the create user form.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('admin/users/create', [
            'roles' => $this->assignableRoles($request->user()),
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    /**
     * Create a user. Accounts created by an administrator are considered
     * verified, so the new user can sign in straight away.
     */
    public function store(StoreUserRequest $request): RedirectResponse
    {
        DB::transaction(function () use ($request) {
            $user = User::create($request->safe()->only(['name', 'email', 'password']));

            $user->forceFill(['email_verified_at' => now()])->save();
            $user->syncRoles($request->validated('roles'));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User created successfully.')]);

        return to_route('admin.users.index');
    }

    /**
     * Show the edit user form.
     */
    public function edit(Request $request, User $user): Response
    {
        abort_unless($this->delegation->canManageUser($request->user(), $user), 403);

        return Inertia::render('admin/users/edit', [
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'created_at' => $user->created_at?->toIso8601String(),
            ],
            'passwordRules' => Password::defaults()->toPasswordRulesString(),
        ]);
    }

    /**
     * Update a user's name, email and (optionally) password.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        $user->fill($request->safe()->only(['name', 'email']));

        if ($request->filled('password')) {
            $user->password = (string) $request->validated('password');
        }

        $user->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User updated successfully.')]);

        return to_route('admin.users.index');
    }

    /**
     * Delete a user.
     */
    public function destroy(Request $request, User $user, DeleteUser $deleteUser): RedirectResponse
    {
        $actor = $request->user();

        if ($user->is($actor)) {
            throw ValidationException::withMessages([
                'user' => __('You cannot delete your own account here. Use your profile settings instead.'),
            ]);
        }

        if (SystemRole::isLastAdmin($user)) {
            throw ValidationException::withMessages(['user' => __('The last administrator cannot be deleted.')]);
        }

        if (! $this->delegation->canManageUser($actor, $user)) {
            throw ValidationException::withMessages([
                'user' => __('You cannot delete a user who has permissions you do not have.'),
            ]);
        }

        $deleteUser->handle($user);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('User deleted successfully.')]);

        return to_route('admin.users.index');
    }

    /**
     * @return array<int, array{id: int, name: string, is_system: bool, permissions: Collection<int, mixed>, assignable: bool}>
     */
    private function assignableRoles(User $actor): array
    {
        return Role::query()
            ->with('permissions:id,name')
            ->where('guard_name', PermissionRegistry::guard())
            ->orderBy('name')
            ->get()
            ->map(fn (Role $role) => [
                'id' => (int) $role->id,
                'name' => (string) $role->name,
                'is_system' => SystemRole::isSystem($role),
                'permissions' => $role->permissions->pluck('name')->sort()->values(),
                'assignable' => $this->delegation->canManageRole($actor, $role),
            ])
            ->values()
            ->all();
    }
}
