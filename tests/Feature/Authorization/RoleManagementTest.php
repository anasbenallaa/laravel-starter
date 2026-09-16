<?php

use App\Authorization\SystemRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

test('guests are redirected from role management', function () {
    $this->get(route('admin.roles.index'))->assertRedirect(route('login'));
});

test('users without roles.view cannot list roles', function () {
    $user = userWithPermissions(['users.view']);

    $this->actingAs($user)->get(route('admin.roles.index'))->assertForbidden();
});

test('users with roles.view can list roles with real counts', function () {
    $viewer = userWithPermissions(['roles.view'], 'Viewer');
    User::factory()->count(2)->create()->each->assignRole(SystemRole::ADMIN);

    $this->actingAs($viewer)
        ->get(route('admin.roles.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/roles/index')
            ->has('roles.data', 2)
            ->where('roles.data.0.name', SystemRole::ADMIN)
            ->where('roles.data.0.is_system', true)
            ->where('roles.data.0.users_count', 2)
            ->where('roles.data.0.permissions_count', 9)
            ->where('roles.data.1.name', 'Viewer')
            ->where('roles.data.1.users_count', 1)
            ->where('roles.data.1.permissions_count', 1)
            ->where('roles.data.1.permissions', ['roles.view'])
            ->has('permissionGroups', 3),
        );

    $this->actingAs($viewer)
        ->get(route('admin.roles.index', ['search' => 'view']))
        ->assertInertia(fn (Assert $page) => $page->has('roles.data', 1)->where('filters.search', 'view'));
});

test('an admin can create a role with permissions', function () {
    $admin = createAdmin();

    $this->actingAs($admin)
        ->post(route('admin.roles.store'), [
            'name' => 'Manager',
            'permissions' => ['users.view', 'users.update'],
        ])
        ->assertRedirect(route('admin.roles.index'))
        ->assertSessionHasNoErrors();

    $role = Role::findByName('Manager');

    expect($role->permissions->pluck('name')->sort()->values()->all())->toBe(['users.update', 'users.view']);
});

test('role names must be unique regardless of case', function () {
    $admin = createAdmin();

    $this->actingAs($admin)
        ->post(route('admin.roles.store'), ['name' => 'admin', 'permissions' => []])
        ->assertSessionHasErrors(['name' => 'Role already exists.']);

    $this->actingAs($admin)
        ->post(route('admin.roles.store'), ['name' => 'Manager', 'permissions' => ['nope.missing']])
        ->assertSessionHasErrors('permissions.0');
});

test('an admin can update a role and its permissions are synchronized', function () {
    $admin = createAdmin();
    $role = Role::create(['name' => 'Manager'])->syncPermissions(['users.view', 'users.update']);

    $this->actingAs($admin)
        ->put(route('admin.roles.update', $role), [
            'name' => 'People Manager',
            'permissions' => ['users.view', 'roles.view'],
        ])
        ->assertRedirect(route('admin.roles.index'))
        ->assertSessionHasNoErrors();

    $role->refresh();

    expect($role->name)->toBe('People Manager')
        ->and($role->permissions->pluck('name')->sort()->values()->all())->toBe(['roles.view', 'users.view']);
});

test('the admin role cannot be renamed or modified', function () {
    $admin = createAdmin();
    $adminRole = Role::findByName(SystemRole::ADMIN);

    $this->actingAs($admin)
        ->put(route('admin.roles.update', $adminRole), ['name' => 'Owner', 'permissions' => []])
        ->assertSessionHasErrors('role');

    expect($adminRole->fresh()->name)->toBe(SystemRole::ADMIN)
        ->and($adminRole->fresh()->permissions()->count())->toBe(9);
});

test('custom roles can be deleted but the admin role cannot', function () {
    $admin = createAdmin();
    $role = Role::create(['name' => 'Manager']);
    $member = User::factory()->create()->assignRole($role);

    $this->actingAs($admin)
        ->delete(route('admin.roles.destroy', $role))
        ->assertRedirect(route('admin.roles.index'));

    expect(Role::where('name', 'Manager')->exists())->toBeFalse()
        ->and($member->fresh()->roles)->toHaveCount(0);

    $this->actingAs($admin)
        ->delete(route('admin.roles.destroy', Role::findByName(SystemRole::ADMIN)))
        ->assertSessionHasErrors(['role' => 'The Admin role cannot be deleted.']);

    expect(Role::where('name', SystemRole::ADMIN)->exists())->toBeTrue();
});

test('role mutations require the matching permission', function () {
    $viewer = userWithPermissions(['roles.view']);
    $role = Role::create(['name' => 'Manager']);

    $this->actingAs($viewer)->get(route('admin.roles.create'))->assertForbidden();
    $this->actingAs($viewer)->post(route('admin.roles.store'), ['name' => 'Hacker', 'permissions' => []])->assertForbidden();
    $this->actingAs($viewer)->get(route('admin.roles.edit', $role))->assertForbidden();
    $this->actingAs($viewer)->put(route('admin.roles.update', $role), ['name' => 'Renamed', 'permissions' => ['roles.delete']])->assertForbidden();
    $this->actingAs($viewer)->delete(route('admin.roles.destroy', $role))->assertForbidden();

    expect(Role::where('name', 'Hacker')->exists())->toBeFalse()
        ->and($role->fresh()->name)->toBe('Manager');
});

test('non admins cannot create roles with permissions they do not have', function () {
    $creator = userWithPermissions(['roles.view', 'roles.create'], 'Role Creator');

    $this->actingAs($creator)
        ->post(route('admin.roles.store'), ['name' => 'Super Manager', 'permissions' => ['roles.view', 'users.delete']])
        ->assertSessionHasErrors('permissions');

    expect(Role::where('name', 'Super Manager')->exists())->toBeFalse();

    $this->actingAs($creator)
        ->post(route('admin.roles.store'), ['name' => 'Viewer', 'permissions' => ['roles.view']])
        ->assertSessionHasNoErrors();

    expect(Role::findByName('Viewer')->hasPermissionTo('roles.view'))->toBeTrue();
});

test('non admins cannot edit or delete roles that exceed their own permissions', function () {
    $editor = userWithPermissions(['roles.view', 'roles.update', 'roles.delete'], 'Role Editor');
    $powerful = Role::create(['name' => 'Powerful'])->syncPermissions(['users.delete']);

    $this->actingAs($editor)
        ->put(route('admin.roles.update', $powerful), ['name' => 'Powerful', 'permissions' => []])
        ->assertSessionHasErrors('role');

    $this->actingAs($editor)
        ->delete(route('admin.roles.destroy', $powerful))
        ->assertSessionHasErrors('role');

    expect($powerful->fresh()->hasPermissionTo('users.delete'))->toBeTrue();

    $modest = Role::create(['name' => 'Modest'])->syncPermissions(['roles.view']);

    $this->actingAs($editor)
        ->put(route('admin.roles.update', $modest), ['name' => 'Modest', 'permissions' => ['roles.view', 'users.delete']])
        ->assertSessionHasErrors('permissions');

    $this->actingAs($editor)
        ->put(route('admin.roles.update', $modest), ['name' => 'Modest', 'permissions' => ['roles.view', 'roles.update']])
        ->assertSessionHasNoErrors();
});

test('the edit page renders role data and management flags', function () {
    $admin = createAdmin();
    $role = Role::create(['name' => 'Manager'])->syncPermissions(['users.view']);

    $this->actingAs($admin)
        ->get(route('admin.roles.edit', $role))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/roles/edit')
            ->where('role.name', 'Manager')
            ->where('role.permissions', ['users.view'])
            ->where('canManage', true)
            ->where('delegablePermissions', null)
            ->has('permissionGroups', 3),
        );

    $this->actingAs($admin)
        ->get(route('admin.roles.edit', Role::findByName(SystemRole::ADMIN)))
        ->assertInertia(fn (Assert $page) => $page->where('role.is_system', true)->where('canManage', false));
});
