<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('users without permissions.view cannot list permissions', function () {
    $this->actingAs(userWithPermissions(['roles.view']))
        ->get(route('admin.permissions.index'))
        ->assertForbidden();
});

test('permissions can be listed, searched and filtered by resource', function () {
    $viewer = userWithPermissions(['permissions.view'], 'Auditor');
    Permission::create(['name' => 'reports.export']);
    User::factory()->create()->givePermissionTo('reports.export');

    $this->actingAs($viewer)
        ->get(route('admin.permissions.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/permissions/index')
            ->has('permissions.data', 10)
            ->where('resources', ['permissions', 'reports', 'roles', 'users']),
        );

    $this->actingAs($viewer)
        ->get(route('admin.permissions.index', ['resource' => 'reports']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('permissions.data', 1)
            ->where('permissions.data.0.name', 'reports.export')
            ->where('permissions.data.0.resource', 'reports')
            ->where('permissions.data.0.action', 'export')
            ->where('permissions.data.0.users_count', 1)
            ->where('permissions.data.0.roles', []),
        );

    $this->actingAs($viewer)
        ->get(route('admin.permissions.index', ['search' => 'roles.']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('permissions.data', 4)
            ->where('permissions.data.0.roles', ['Admin']),
        );
});

test('permissions cannot be created, renamed or deleted over http, even by admins', function () {
    $admin = createAdmin();
    $permission = Permission::findByName('users.view');

    $this->actingAs($admin)->post('/admin/permissions', ['name' => 'orders.approve'])->assertMethodNotAllowed();
    $this->actingAs($admin)->put("/admin/permissions/{$permission->id}", ['name' => 'users.gone'])->assertNotFound();
    $this->actingAs($admin)->delete("/admin/permissions/{$permission->id}")->assertNotFound();

    expect(Permission::where('name', 'orders.approve')->exists())->toBeFalse()
        ->and($permission->fresh()->name)->toBe('users.view');
});

test('the cleanup migration removes the retired permission management permissions', function () {
    seedAccessControl();

    foreach (['permissions.create', 'permissions.update', 'permissions.delete'] as $name) {
        Permission::create(['name' => $name]);
    }

    $role = Role::create(['name' => 'Legacy'])->syncPermissions(['permissions.create', 'users.view']);
    $user = User::factory()->create()->givePermissionTo('permissions.delete');

    $migration = require database_path('migrations/2026_09_16_150000_remove_ui_permission_management_permissions.php');
    $migration->up();

    expect(Permission::whereLike('name', 'permissions.%')->pluck('name')->all())->toBe(['permissions.view'])
        ->and(DB::table('role_has_permissions')->where('role_id', $role->id)->count())->toBe(1)
        ->and($user->fresh()->getAllPermissions())->toHaveCount(0);
});
