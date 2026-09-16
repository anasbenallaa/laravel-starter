<?php

use App\Models\Activity;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('role assignments and direct permissions are logged individually', function () {
    $admin = createAdmin(['name' => 'Ada Admin']);
    Role::create(['name' => 'Manager']);
    Role::create(['name' => 'Operator']);
    $user = User::factory()->create(['name' => 'John Doe'])->assignRole('Operator')->givePermissionTo('roles.view');

    $this->actingAs($admin)->put(route('admin.users.access.update', $user), [
        'roles' => ['Manager'],
        'permissions' => ['users.view'],
    ])->assertSessionHasNoErrors();

    $descriptions = Activity::query()
        ->where('user_id', $admin->id)
        ->whereIn('action', ['assigned', 'unassigned', 'granted', 'revoked'])
        ->orderBy('id')
        ->pluck('description')
        ->all();

    expect($descriptions)->toBe([
        'Assigned role Manager to John Doe',
        'Removed role Operator from John Doe',
        'Granted users.view to John Doe',
        'Revoked roles.view from John Doe',
    ]);
});

test('role create, update and delete are logged once with their permissions', function () {
    $admin = createAdmin();

    $this->actingAs($admin)->post(route('admin.roles.store'), ['name' => 'Manager', 'permissions' => ['users.view']]);
    $role = Role::findByName('Manager');

    $this->actingAs($admin)->put(route('admin.roles.update', $role), ['name' => 'Team Manager', 'permissions' => ['users.view', 'roles.view']]);
    $this->actingAs($admin)->delete(route('admin.roles.destroy', $role));

    $activities = Activity::query()->where('subject_type', $role->getMorphClass())->orderBy('id')->get();

    expect($activities->pluck('action')->all())->toBe(['created', 'updated', 'deleted'])
        ->and($activities[0]->new_values)->toBe(['name' => 'Manager', 'permissions' => ['users.view']])
        ->and($activities[1]->old_values)->toBe(['name' => 'Manager', 'permissions' => ['users.view']])
        ->and($activities[1]->new_values)->toBe(['name' => 'Team Manager', 'permissions' => ['roles.view', 'users.view']])
        ->and($activities[1]->metadata)->toBe(['permissions_added' => ['roles.view']])
        ->and($activities[2]->description)->toBe('Deleted role Team Manager');
});

test('creating a user logs one created entry plus their roles', function () {
    $admin = createAdmin();
    Role::create(['name' => 'Manager']);

    $this->actingAs($admin)->post(route('admin.users.store'), [
        'name' => 'Jane Roe',
        'email' => 'jane@example.com',
        'password' => 'secret-password',
        'password_confirmation' => 'secret-password',
        'roles' => ['Manager'],
    ])->assertSessionHasNoErrors();

    $user = User::where('email', 'jane@example.com')->sole();
    $actions = Activity::query()->where('subject_id', $user->id)->where('subject_type', $user->getMorphClass())->orderBy('id')->pluck('action')->all();

    expect($actions)->toBe(['created', 'assigned']);
});
