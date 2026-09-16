<?php

use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Models\User;
use Database\Seeders\DatabaseSeeder;
use Database\Seeders\RoleAndPermissionSeeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Traits\HasRoles;

$initialPermissions = [
    'users.view', 'users.create', 'users.update', 'users.delete',
    'roles.view', 'roles.create', 'roles.update', 'roles.delete',
    'permissions.view',
    'activities.view.all',
];

test('the user model uses spatie roles', function () {
    expect(class_uses_recursive(User::class))->toContain(HasRoles::class);

    $role = Role::create(['name' => 'Operator']);
    $permission = Permission::create(['name' => 'reports.view']);
    $role->givePermissionTo($permission);

    $user = User::factory()->create()->assignRole('Operator');

    expect($user->hasRole('Operator'))->toBeTrue()
        ->and($user->hasPermissionTo('reports.view'))->toBeTrue()
        ->and($user->can('reports.view'))->toBeTrue()
        ->and($role->guard_name)->toBe('web');
});

test('the configured permissions follow the resource.action convention', function () use ($initialPermissions) {
    expect(PermissionRegistry::configured())->toBe($initialPermissions);

    foreach (PermissionRegistry::configured() as $name) {
        expect(PermissionRegistry::isValidName($name))->toBeTrue();
    }
});

test('the seeder creates the admin role and grants it every permission', function () use ($initialPermissions) {
    $this->seed(RoleAndPermissionSeeder::class);

    $admin = Role::findByName(SystemRole::ADMIN, 'web');

    expect(Permission::pluck('name')->sort()->values()->all())->toBe(collect($initialPermissions)->sort()->values()->all())
        ->and($admin->permissions->pluck('name')->sort()->values()->all())->toBe(collect($initialPermissions)->sort()->values()->all());
});

test('seeding is idempotent', function () {
    $this->seed(DatabaseSeeder::class);
    $this->seed(DatabaseSeeder::class);

    expect(Role::count())->toBe(1)
        ->and(Permission::count())->toBe(10)
        ->and(User::where('email', 'test@example.com')->count())->toBe(1)
        ->and(User::where('email', 'test@example.com')->first()->hasRole(SystemRole::ADMIN))->toBeTrue();
});

test('the sync command reports what it did and never deletes unknown permissions', function () {
    Permission::create(['name' => 'legacy.export']);
    Permission::create(['name' => 'users.view']);

    $this->artisan('permissions:sync')
        ->expectsOutputToContain('Permissions synchronized successfully.')
        ->assertSuccessful();

    expect(Permission::where('name', 'legacy.export')->exists())->toBeTrue()
        ->and(Permission::count())->toBe(11)
        ->and(Role::findByName(SystemRole::ADMIN)->permissions()->count())->toBe(11);

    $this->artisan('permissions:sync')->assertSuccessful();

    expect(Permission::count())->toBe(11);
});

test('the sync rejects badly named permissions in the config', function () {
    config(['permissions.Reports' => ['Export All']]);

    $this->artisan('permissions:sync');
})->throws(InvalidArgumentException::class, 'resource.action');

test('admins pass every permission check, even for permissions they were never granted', function () {
    $admin = createAdmin();

    Permission::create(['name' => 'orders.approve']);

    expect($admin->can('users.view'))->toBeTrue()
        ->and($admin->can('roles.update'))->toBeTrue()
        ->and($admin->can('orders.approve'))->toBeTrue()
        ->and($admin->can('some.ability_that_does_not_exist'))->toBeTrue();
});

test('regular roles only grant their own permissions', function () {
    $manager = userWithPermissions(['users.view', 'users.update'], 'Manager');

    expect($manager->can('users.view'))->toBeTrue()
        ->and($manager->can('users.update'))->toBeTrue()
        ->and($manager->can('users.delete'))->toBeFalse()
        ->and($manager->can('roles.view'))->toBeFalse();
});

test('direct user permissions grant access', function () {
    seedAccessControl();

    $user = User::factory()->create()->givePermissionTo('roles.view');

    expect($user->can('roles.view'))->toBeTrue()
        ->and($user->can('roles.update'))->toBeFalse();
});

test('permissions are grouped by resource with crud actions first', function () {
    foreach (['reports.export', 'users.delete', 'users.approve', 'users.view', 'reports.view'] as $name) {
        Permission::create(['name' => $name]);
    }

    $groups = PermissionRegistry::group(Permission::all());

    expect(collect($groups)->pluck('resource')->all())->toBe(['reports', 'users'])
        ->and(collect($groups[1]['permissions'])->pluck('name')->all())->toBe(['users.view', 'users.delete', 'users.approve'])
        ->and(collect($groups[0]['permissions'])->pluck('action')->all())->toBe(['view', 'export']);
});

test('the shared auth props expose role and permission names only', function () {
    $manager = userWithPermissions(['users.view', 'roles.view'], 'Manager');

    $this->actingAs($manager)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('auth.roles', ['Manager'])
            ->where('auth.permissions', ['roles.view', 'users.view'])
            ->where('auth.isAdmin', false)
            ->missing('auth.user.roles')
            ->missing('auth.user.permissions'),
        );

    $admin = createAdmin();

    $this->actingAs($admin)
        ->get(route('dashboard'))
        ->assertInertia(fn ($page) => $page
            ->where('auth.isAdmin', true)
            ->where('auth.roles', [SystemRole::ADMIN])
            ->has('auth.permissions', 10),
        );
});

test('the last administrator cannot delete their own account', function () {
    $admin = createAdmin();

    $this->actingAs($admin)
        ->from(route('profile.edit'))
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasErrors('password');

    expect($admin->fresh())->not->toBeNull();

    $other = User::factory()->create()->assignRole(SystemRole::ADMIN);

    $this->actingAs($admin)
        ->delete(route('profile.destroy'), ['password' => 'password'])
        ->assertSessionHasNoErrors();

    expect($admin->fresh())->toBeNull()
        ->and($other->fresh()->hasRole(SystemRole::ADMIN))->toBeTrue();
});
