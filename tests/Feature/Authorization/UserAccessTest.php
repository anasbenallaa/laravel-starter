<?php

use App\Authorization\SystemRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('users without users.view cannot list users', function () {
    $this->actingAs(userWithPermissions(['roles.view']))
        ->get(route('admin.users.index'))
        ->assertForbidden();
});

test('users are listed with roles and direct permissions, searchable and filterable', function () {
    $viewer = userWithPermissions(['users.view'], 'Viewer');
    Role::create(['name' => 'Manager']);

    User::factory()->create(['name' => 'John Doe', 'email' => 'john@example.com'])
        ->assignRole('Manager')
        ->givePermissionTo('roles.view');
    User::factory()->create(['name' => 'Jane Roe', 'email' => 'jane@example.com']);

    $this->actingAs($viewer)
        ->get(route('admin.users.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/index')
            ->has('users.data', 3)
            ->where('roles', [SystemRole::ADMIN, 'Manager', 'Viewer']),
        );

    $this->actingAs($viewer)
        ->get(route('admin.users.index', ['search' => 'JOHN@']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 1)
            ->where('users.data.0.name', 'John Doe')
            ->where('users.data.0.roles', ['Manager'])
            ->where('users.data.0.permissions', ['roles.view']),
        );

    $this->actingAs($viewer)
        ->get(route('admin.users.index', ['role' => 'Manager', 'search' => 'j']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 1)
            ->where('filters.role', 'Manager')
            ->where('users.next_page_url', null),
        );
});

test('the users list can be sorted by an allowed column, keeping filters in pagination links', function () {
    $admin = createAdmin(['name' => 'Mia Admin', 'email' => 'mia@example.com']);
    $this->travel(-2)->days();
    User::factory()->create(['name' => 'Zed Older', 'email' => 'zed@example.com']);
    $this->travelBack();
    User::factory()->create(['name' => 'Abe Newest', 'email' => 'abe@example.com']);

    $this->actingAs($admin)
        ->get(route('admin.users.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('sort', ['column' => 'name', 'direction' => 'asc'])
            ->where('users.data.0.name', 'Abe Newest'),
        );

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['sort' => 'name', 'direction' => 'desc']))
        ->assertInertia(fn (Assert $page) => $page->where('users.data.0.name', 'Zed Older'));

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['sort' => 'created_at', 'direction' => 'asc']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('sort', ['column' => 'created_at', 'direction' => 'asc'])
            ->where('users.data.0.name', 'Zed Older'),
        );

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['sort' => 'password', 'direction' => 'desc']))
        ->assertInertia(fn (Assert $page) => $page->where('sort', ['column' => 'name', 'direction' => 'desc']));

    User::factory()->count(20)->create();

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['sort' => 'email', 'direction' => 'desc', 'search' => 'example']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('users.next_page_url', fn (string $url) => str_contains($url, 'sort=email')
                && str_contains($url, 'direction=desc')
                && str_contains($url, 'search=example')),
        );
});

test('the users list is paginated', function () {
    $admin = createAdmin();
    User::factory()->count(25)->create();

    $this->actingAs($admin)
        ->get(route('admin.users.index', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page
            ->has('users.data', 6)
            ->where('users.current_page', 2)
            ->where('users.total', 26),
        );
});

test('the access editor shows assigned, direct and effective permissions', function () {
    $admin = createAdmin();
    Role::create(['name' => 'Manager'])->syncPermissions(['users.view']);
    $user = User::factory()->create()->assignRole('Manager')->givePermissionTo('roles.view');

    $this->actingAs($admin)
        ->get(route('admin.users.access.edit', $user))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/users/access')
            ->where('assigned.roles', ['Manager'])
            ->where('assigned.permissions', ['roles.view'])
            ->where('effectivePermissions', ['roles.view', 'users.view'])
            ->where('isLastAdmin', false)
            ->has('roles', 2),
        );
});

test('an authorized user can sync roles and direct permissions', function () {
    $admin = createAdmin();
    Role::create(['name' => 'Manager']);
    Role::create(['name' => 'Operator']);
    $user = User::factory()->create()->assignRole('Operator')->givePermissionTo('roles.view');

    $this->actingAs($admin)
        ->put(route('admin.users.access.update', $user), [
            'roles' => ['Manager'],
            'permissions' => ['users.view'],
        ])
        ->assertRedirect(route('admin.users.access.edit', $user))
        ->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->getRoleNames()->all())->toBe(['Manager'])
        ->and($user->getDirectPermissions()->pluck('name')->all())->toBe(['users.view']);

    $this->actingAs($admin)
        ->put(route('admin.users.access.update', $user), ['roles' => [], 'permissions' => []])
        ->assertSessionHasNoErrors();

    expect($user->fresh()->roles)->toHaveCount(0)
        ->and($user->fresh()->permissions)->toHaveCount(0);
});

test('unknown roles and permissions are rejected', function () {
    $admin = createAdmin();
    $user = User::factory()->create();

    $this->actingAs($admin)
        ->put(route('admin.users.access.update', $user), ['roles' => ['Ghost'], 'permissions' => ['ghost.view']])
        ->assertSessionHasErrors(['roles.0', 'permissions.0']);
});

test('the last admin cannot lose the admin role', function () {
    $admin = createAdmin();

    $this->actingAs($admin)
        ->put(route('admin.users.access.update', $admin), ['roles' => [], 'permissions' => []])
        ->assertSessionHasErrors(['roles' => 'The last administrator cannot lose the Admin role.']);

    expect($admin->fresh()->hasRole(SystemRole::ADMIN))->toBeTrue();

    $second = User::factory()->create()->assignRole(SystemRole::ADMIN);

    $this->actingAs($second)
        ->put(route('admin.users.access.update', $admin), ['roles' => [], 'permissions' => []])
        ->assertSessionHasNoErrors();

    expect($admin->fresh()->hasRole(SystemRole::ADMIN))->toBeFalse()
        ->and($second->fresh()->hasRole(SystemRole::ADMIN))->toBeTrue();
});

test('non admins cannot grant the admin role, not even to themselves', function () {
    $manager = userWithPermissions(['users.view', 'users.update'], 'User Manager');
    $target = User::factory()->create();

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $target), ['roles' => [SystemRole::ADMIN], 'permissions' => []])
        ->assertSessionHasErrors(['roles' => 'Only an administrator can assign or remove the Admin role.']);

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $manager), ['roles' => ['User Manager', SystemRole::ADMIN], 'permissions' => []])
        ->assertSessionHasErrors('roles');

    expect($target->fresh()->hasRole(SystemRole::ADMIN))->toBeFalse()
        ->and($manager->fresh()->hasRole(SystemRole::ADMIN))->toBeFalse();
});

test('non admins cannot remove the admin role from someone else', function () {
    $admin = createAdmin();
    User::factory()->create()->assignRole(SystemRole::ADMIN);
    $manager = userWithPermissions(['users.view', 'users.update'], 'User Manager');

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $admin), ['roles' => [], 'permissions' => []])
        ->assertSessionHasErrors('roles');

    expect($admin->fresh()->hasRole(SystemRole::ADMIN))->toBeTrue();
});

test('non admins can only assign roles and permissions within their own access', function () {
    $manager = userWithPermissions(['users.view', 'users.update'], 'User Manager');
    Role::create(['name' => 'Viewer'])->syncPermissions(['users.view']);
    Role::create(['name' => 'Role Admin'])->syncPermissions(['roles.create', 'roles.delete']);
    $target = User::factory()->create();

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $target), ['roles' => ['Role Admin'], 'permissions' => []])
        ->assertSessionHasErrors('roles');

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $target), ['roles' => [], 'permissions' => ['roles.delete']])
        ->assertSessionHasErrors('permissions');

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $manager), ['roles' => ['User Manager'], 'permissions' => ['roles.update']])
        ->assertSessionHasErrors('permissions');

    expect($target->fresh()->roles)->toHaveCount(0)
        ->and($manager->fresh()->can('roles.update'))->toBeFalse();

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $target), ['roles' => ['Viewer'], 'permissions' => ['users.update']])
        ->assertSessionHasNoErrors();

    expect($target->fresh()->can('users.view'))->toBeTrue()
        ->and($target->fresh()->can('users.update'))->toBeTrue();
});

test('a limited manager can save a user whose unchanged access exceeds their own', function () {
    $manager = userWithPermissions(['users.view', 'users.update'], 'User Manager');
    Role::create(['name' => 'Viewer'])->syncPermissions(['users.view']);
    Role::create(['name' => 'Role Admin'])->syncPermissions(['roles.delete']);
    $target = User::factory()->create()->assignRole('Role Admin')->givePermissionTo('roles.create');

    $this->actingAs($manager)
        ->put(route('admin.users.access.update', $target), [
            'roles' => ['Role Admin', 'Viewer'],
            'permissions' => ['roles.create'],
        ])
        ->assertSessionHasNoErrors();

    expect($target->fresh()->getRoleNames()->sort()->values()->all())->toBe(['Role Admin', 'Viewer']);
});

test('user access mutations require users.update', function () {
    $viewer = userWithPermissions(['users.view']);
    $target = User::factory()->create();

    $this->actingAs($viewer)->get(route('admin.users.access.edit', $target))->assertForbidden();
    $this->actingAs($viewer)
        ->put(route('admin.users.access.update', $viewer), ['roles' => [SystemRole::ADMIN], 'permissions' => ['users.update']])
        ->assertForbidden();

    expect($viewer->fresh()->can('users.update'))->toBeFalse();
});
