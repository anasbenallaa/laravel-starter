<?php

use App\Authorization\SystemRole;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('guests cannot search', function () {
    $this->getJson(route('search', ['q' => 'admin']))->assertUnauthorized();
});

test('users without any searchable permission are forbidden', function () {
    seedAccessControl();

    $this->actingAs(User::factory()->create())
        ->getJson(route('search', ['q' => 'admin']))
        ->assertForbidden();
});

test('users can be found by name or email, limited to five', function () {
    $viewer = userWithPermissions(['users.view'], 'Viewer');
    User::factory()->create(['name' => 'Jane Roe', 'email' => 'jane@example.com']);
    User::factory()->create(['name' => 'Someone Else', 'email' => 'jroe@company.test']);
    User::factory()->count(8)->create(['name' => fn () => 'Roe '.fake()->unique()->firstName()]);

    $this->actingAs($viewer)
        ->getJson(route('search', ['q' => 'jane']))
        ->assertOk()
        ->assertJsonCount(1, 'groups')
        ->assertJsonPath('groups.0.key', 'users')
        ->assertJsonPath('groups.0.results.0.title', 'Jane Roe')
        ->assertJsonPath('groups.0.results.0.description', 'jane@example.com')
        ->assertJsonPath('groups.0.results.0.href', '/admin/users?search=jane%40example.com');

    $this->actingAs($viewer)
        ->getJson(route('search', ['q' => 'company.test']))
        ->assertJsonPath('groups.0.results.0.title', 'Someone Else');

    $this->actingAs($viewer)
        ->getJson(route('search', ['q' => 'roe']))
        ->assertJsonCount(5, 'groups.0.results');
});

test('only groups the user may view are returned', function () {
    $viewer = userWithPermissions(['users.view'], 'Viewer');
    User::factory()->create(['name' => 'Victor Viewer']);
    Role::create(['name' => 'Viewer Plus']);

    $this->actingAs($viewer)
        ->getJson(route('search', ['q' => 'view']))
        ->assertJsonMissingPath('groups.1')
        ->assertJsonPath('groups.0.key', 'users');
});

test('roles and permissions are searchable with the matching permissions', function () {
    $manager = userWithPermissions(['roles.view', 'permissions.view'], 'Role Auditor');

    $this->actingAs($manager)
        ->getJson(route('search', ['q' => 'roles']))
        ->assertJsonCount(1, 'groups')
        ->assertJsonPath('groups.0.key', 'permissions')
        ->assertJsonCount(4, 'groups.0.results')
        ->assertJsonPath('groups.0.results.0.href', '/admin/roles?view=permissions&permission=roles.create');

    $this->actingAs($manager)
        ->getJson(route('search', ['q' => 'audit']))
        ->assertJsonPath('groups.0.key', 'roles')
        ->assertJsonPath('groups.0.results.0.title', 'Role Auditor')
        ->assertJsonPath('groups.0.results.0.description', '2 permissions · 1 user')
        ->assertJsonPath('groups.0.results.0.href', '/admin/roles?search=Role%20Auditor');
});

test('roles link to the edit page when the user can update roles', function () {
    $admin = createAdmin(['name' => 'Ada Admin']);
    $role = Role::findByName(SystemRole::ADMIN);

    $this->actingAs($admin)
        ->getJson(route('search', ['q' => 'admin']))
        ->assertJsonPath('groups.0.key', 'users')
        ->assertJsonPath('groups.1.key', 'roles')
        ->assertJsonPath('groups.1.results.0.href', "/admin/roles/{$role->id}/edit")
        ->assertJsonPath('groups.1.results.0.description', 'System role · all permissions · 1 user');
});

test('short queries return no groups', function () {
    $this->actingAs(createAdmin())
        ->getJson(route('search', ['q' => 'a']))
        ->assertOk()
        ->assertExactJson(['groups' => []]);
});
