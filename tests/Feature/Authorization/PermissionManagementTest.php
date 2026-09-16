<?php

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

test('users need roles.view or permissions.view to open the roles & permissions page', function () {
    $this->actingAs(userWithPermissions(['users.view']))
        ->get(route('admin.roles.index'))
        ->assertForbidden();
});

test('the page only sends the sections the user may view', function () {
    $this->actingAs(userWithPermissions(['permissions.view'], 'Auditor'))
        ->get(route('admin.roles.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('admin/roles/index')
            ->where('roles', null)
            ->has('permissions', 11),
        );

    $this->actingAs(userWithPermissions(['roles.view'], 'Role Viewer'))
        ->get(route('admin.roles.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('permissions', null)
            ->has('roles.data', 3),
        );
});

test('every permission is listed with its roles and direct users', function () {
    $viewer = userWithPermissions(['permissions.view'], 'Auditor');
    Permission::create(['name' => 'reports.export']);
    User::factory()->create()->givePermissionTo('reports.export');

    $this->actingAs($viewer)
        ->get(route('admin.roles.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('permissions', 12)
            ->where('permissions.3.name', 'reports.export')
            ->where('permissions.3.resource', 'reports')
            ->where('permissions.3.action', 'export')
            ->where('permissions.3.users_count', 1)
            ->where('permissions.3.roles', [])
            ->where('permissions.2.name', 'permissions.view')
            ->where('permissions.2.roles', ['Admin', 'Auditor']),
        );
});

test('the separate permissions page no longer exists', function () {
    $this->actingAs(createAdmin())->get('/admin/permissions')->assertNotFound();
});

test('permissions cannot be created, renamed or deleted over http, even by admins', function () {
    $admin = createAdmin();
    $permission = Permission::findByName('users.view');

    $this->actingAs($admin)->post('/admin/permissions', ['name' => 'orders.approve'])->assertNotFound();
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
