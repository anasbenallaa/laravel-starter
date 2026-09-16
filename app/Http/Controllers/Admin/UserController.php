<?php

namespace App\Http\Controllers\Admin;

use App\Actions\Authorization\LogAccessChanges;
use App\Actions\Users\DeleteUser;
use App\Authorization\PermissionDelegation;
use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Contracts\ActivityLoggerInterface;
use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\StoreUserRequest;
use App\Http\Requests\Admin\UpdateUserRequest;
use App\Models\User;
use App\Support\SortOrder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
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

        $sort = SortOrder::fromRequest($request, [
            'name' => 'name',
            'email' => 'email',
            'created_at' => 'created_at',
        ], default: 'name');

        $users = User::query()
            // roles.permissions lets canManageUser() work without extra queries.
            ->with(['roles:id,name', 'roles.permissions:id,name', 'permissions:id,name'])
            ->when($search !== '', fn ($query) => $query->where(fn ($query) => $query
                ->whereLike('name', "%{$search}%")
                ->orWhereLike('email', "%{$search}%")))
            ->when($role, fn ($query) => $query->whereHas('roles', fn ($query) => $query->where('name', $role)))
            ->tap($sort->apply(...))
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
            'sort' => $sort->toArray(),
        ]);
    }

    /**
     * Show the create user form.
     */
    public function create(Request $request): Response
    {
        return Inertia::render('admin/users/create', [
            'roles' => $this->assignableRoles($request->user()),
            'passwordRules' => PasswordRule::defaults()->toPasswordRulesString(),
        ]);
    }

    /**
     * Create a user. Accounts created by an administrator are considered
     * verified, so the new user can sign in straight away.
     */
    public function store(StoreUserRequest $request, LogAccessChanges $log): RedirectResponse
    {
        DB::transaction(function () use ($request, $log) {
            // Built before saving so the observer logs a single "created" entry.
            $user = new User($request->safe()->only(['name', 'email', 'password']));
            $user->forceFill(['email_verified_at' => now()])->save();

            $user->syncRoles($request->validated('roles'));
            $log->userRoles($user, [], (array) $request->validated('roles'));
        });

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.user_created')]);

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
        ]);
    }

    /**
     * Update a user's name, email and (optionally) password.
     */
    public function update(UpdateUserRequest $request, User $user): RedirectResponse
    {
        // Name/email changes are logged by the Auditable observer.
        $user->update($request->safe()->only(['name', 'email']));

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.user_updated')]);

        return to_route('admin.users.index');
    }

    /**
     * Email the user a password reset link, using the same broker, email and
     * reset page as "Forgot password". Administrators never set passwords.
     */
    public function sendPasswordReset(Request $request, User $user, ActivityLoggerInterface $activity): RedirectResponse
    {
        abort_unless($this->delegation->canManageUser($request->user(), $user), 403);

        $status = Password::broker()->sendResetLink(['email' => $user->email]);

        if ($status !== Password::RESET_LINK_SENT) {
            throw ValidationException::withMessages(['password_reset' => __($status)]);
        }

        $activity->log(
            action: 'password_reset_sent',
            description: "Sent a password reset link to {$user->name}",
            subject: $user,
        );

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.password_reset_link_sent', ['email' => $user->email])]);

        return back();
    }

    /**
     * Delete a user.
     */
    public function destroy(Request $request, User $user, DeleteUser $deleteUser): RedirectResponse
    {
        $actor = $request->user();

        if ($user->is($actor)) {
            throw ValidationException::withMessages([
                'user' => __('errors.users.cannot_delete_self'),
            ]);
        }

        if (SystemRole::isLastAdmin($user)) {
            throw ValidationException::withMessages(['user' => __('errors.users.last_admin_delete')]);
        }

        if (! $this->delegation->canManageUser($actor, $user)) {
            throw ValidationException::withMessages([
                'user' => __('errors.users.delete_more_permissions'),
            ]);
        }

        $deleteUser->handle($user);

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.user_deleted')]);

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
