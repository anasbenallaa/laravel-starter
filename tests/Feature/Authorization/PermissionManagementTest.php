<?php

use App\Authorization\SystemRole;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('users without permissions.view cannot list permissions', function () {
    $this->actingAs(userWithPermissions(['roles.view']))
        ->get(route('admin.permissions.index'))
        ->assertForbidden();
});

test('permissions can be listed, searched and filtered by resource', function () {
    $admin = createAdmin();
    Permission::create(['name' => 'reports.export']);
    User::factory()->create()->givePermissionTo('reports.export');

    $this->actingAs($admin)
        ->get(route('admin.permissions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/permissions/index')
            ->has('permissions.data', 13)
            ->where('resources', ['permissions', 'reports', 'roles', 'users']),
        );

    $this->actingAs($admin)
        ->get(route('admin.permissions.index', ['resource' => 'reports']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('permissions.data', 1)
            ->where('permissions.data.0.name', 'reports.export')
            ->where('permissions.data.0.resource', 'reports')
            ->where('permissions.data.0.action', 'export')
            ->where('permissions.data.0.users_count', 1)
            ->where('permissions.data.0.roles', [])
            ->where('permissions.data.0.is_configured', false),
        );

    $this->actingAs($admin)
        ->get(route('admin.permissions.index', ['search' => 'roles.']))
        ->assertInertia(fn (Assert $page) => $page->has('permissions.data', 4));
});

test('an authorized user can create a permission, which is granted to admin', function () {
    $admin = createAdmin();

    $this->actingAs($admin)
        ->post(route('admin.permissions.store'), ['name' => 'orders.approve'])
        ->assertSessionHasNoErrors();

    expect(Permission::where('name', 'orders.approve')->exists())->toBeTrue()
        ->and(Role::findByName(SystemRole::ADMIN)->hasPermissionTo('orders.approve'))->toBeTrue();
});

test('permission names must follow resource.action', function (string $name) {
    $this->actingAs(createAdmin())
        ->post(route('admin.permissions.store'), ['name' => $name])
        ->assertSessionHasErrors('name');
})->with(['some random permission', 'USER EDIT', 'foo/bar', 'users', 'users.view.all', '.view', 'Users.View', 'users.view']);

test('future actions are allowed', function (string $name) {
    $this->actingAs(createAdmin())
        ->post(route('admin.permissions.store'), ['name' => $name])
        ->assertSessionHasNoErrors();
})->with(['documents.approve', 'reports.export', 'integrations.disconnect', 'purchase_orders.restore']);

test('an admin can rename a permission and checks follow the new name', function () {
    $admin = createAdmin();
    $permission = Permission::create(['name' => 'reports.view']);
    $user = userWithPermissions(['reports.view'], 'Analyst');

    $this->actingAs($admin)
        ->put(route('admin.permissions.update', $permission), ['name' => 'reports.read'])
        ->assertSessionHasNoErrors();

    expect($permission->fresh()->name)->toBe('reports.read')
        ->and($user->fresh()->can('reports.read'))->toBeTrue()
        ->and($user->fresh()->can('reports.view'))->toBeFalse();
});

test('non admins cannot rename permissions that are in use', function () {
    $editor = userWithPermissions(['permissions.update', 'reports.view'], 'Permission Editor');
    $permission = Permission::findByName('reports.view');

    $this->actingAs($editor)
        ->put(route('admin.permissions.update', $permission), ['name' => 'users.delete_all'])
        ->assertSessionHasErrors('name');

    expect($permission->fresh()->name)->toBe('reports.view');

    $unused = Permission::create(['name' => 'reprots.export']);

    $this->actingAs($editor)
        ->put(route('admin.permissions.update', $unused), ['name' => 'reports.export'])
        ->assertSessionHasNoErrors();
});

test('an authorized user can delete a permission and it is removed everywhere', function () {
    $admin = createAdmin();
    $user = userWithPermissions(['reports.view'], 'Analyst');
    $user->givePermissionTo('reports.view');
    $permission = Permission::findByName('reports.view');

    $this->actingAs($admin)
        ->delete(route('admin.permissions.destroy', $permission))
        ->assertSessionHasNoErrors();

    expect(Permission::where('name', 'reports.view')->exists())->toBeFalse()
        ->and($user->fresh()->getAllPermissions()->pluck('name')->all())->toBe([]);
});

test('permission mutations require the matching permission', function () {
    $viewer = userWithPermissions(['permissions.view']);
    $permission = Permission::findByName('users.view');

    $this->actingAs($viewer)->post(route('admin.permissions.store'), ['name' => 'evil.grant'])->assertForbidden();
    $this->actingAs($viewer)->put(route('admin.permissions.update', $permission), ['name' => 'users.gone'])->assertForbidden();
    $this->actingAs($viewer)->delete(route('admin.permissions.destroy', $permission))->assertForbidden();

    expect(Permission::where('name', 'evil.grant')->exists())->toBeFalse()
        ->and($permission->fresh())->not->toBeNull();
});
