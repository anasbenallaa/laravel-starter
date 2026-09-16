<?php

use App\Authorization\SystemRole;
use App\Models\Activity;
use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Storage;
use Inertia\Testing\AssertableInertia as Assert;
use Spatie\Permission\Models\Role;

$newUser = [
    'name' => 'Jane Roe',
    'email' => 'jane@example.com',
    'password' => 'secret-password',
    'password_confirmation' => 'secret-password',
    'roles' => [],
];

test('an authorized user can create a user with roles', function () use ($newUser) {
    $admin = createAdmin();
    Role::create(['name' => 'Manager'])->syncPermissions(['users.view']);

    $this->actingAs($admin)->get(route('admin.users.create'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page->component('admin/users/create')->has('roles', 2));

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [...$newUser, 'roles' => ['Manager']])
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHasNoErrors();

    $user = User::where('email', 'jane@example.com')->firstOrFail();

    expect($user->name)->toBe('Jane Roe')
        ->and(Hash::check('secret-password', $user->password))->toBeTrue()
        ->and($user->email_verified_at)->not->toBeNull()
        ->and($user->getRoleNames()->all())->toBe(['Manager']);
});

test('creating a user validates the input', function () use ($newUser) {
    $admin = createAdmin(['email' => 'taken@example.com']);

    $this->actingAs($admin)
        ->post(route('admin.users.store'), [
            ...$newUser,
            'email' => 'taken@example.com',
            'password_confirmation' => 'different',
            'roles' => ['Ghost'],
        ])
        ->assertSessionHasErrors(['email', 'password', 'roles.0']);

    expect(User::count())->toBe(1);
});

test('non admins cannot create users with roles beyond their own access', function () use ($newUser) {
    $creator = userWithPermissions(['users.view', 'users.create'], 'Recruiter');
    Role::create(['name' => 'Role Admin'])->syncPermissions(['roles.delete']);

    $this->actingAs($creator)
        ->post(route('admin.users.store'), [...$newUser, 'roles' => [SystemRole::ADMIN]])
        ->assertSessionHasErrors('roles');

    $this->actingAs($creator)
        ->post(route('admin.users.store'), [...$newUser, 'roles' => ['Role Admin']])
        ->assertSessionHasErrors('roles');

    expect(User::where('email', 'jane@example.com')->exists())->toBeFalse();

    $this->actingAs($creator)
        ->post(route('admin.users.store'), [...$newUser, 'roles' => ['Recruiter']])
        ->assertSessionHasNoErrors();
});

test('an authorized user can update a user, but never their password', function () {
    $admin = createAdmin();
    $user = User::factory()->create(['name' => 'Old Name', 'password' => 'original-password']);

    $this->actingAs($admin)->get(route('admin.users.edit', $user))
        ->assertInertia(fn (Assert $page) => $page->component('admin/users/edit')->where('user.name', 'Old Name'));

    $this->actingAs($admin)
        ->put(route('admin.users.update', $user), [
            'name' => 'New Name',
            'email' => 'new@example.com',
            'password' => 'attempted-password',
            'password_confirmation' => 'attempted-password',
        ])
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHasNoErrors();

    $user->refresh();

    expect($user->name)->toBe('New Name')
        ->and($user->email)->toBe('new@example.com')
        ->and(Hash::check('original-password', $user->password))->toBeTrue();
});

test('an authorized user can send a password reset link using the standard reset flow', function () {
    Notification::fake();
    $admin = createAdmin();
    $user = User::factory()->create(['name' => 'Jane Roe']);

    $this->actingAs($admin)
        ->from(route('admin.users.edit', $user))
        ->post(route('admin.users.password-reset', $user))
        ->assertRedirect(route('admin.users.edit', $user))
        ->assertSessionHasNoErrors();

    Notification::assertSentTo($user, ResetPassword::class);

    expect(DB::table('password_reset_tokens')->where('email', $user->email)->exists())->toBeTrue()
        ->and(Activity::query()->where('action', 'password_reset_sent')->sole()->description)->toBe('Sent a password reset link to Jane Roe');
});

test('password reset links are throttled like the forgot password flow', function () {
    Notification::fake();
    $admin = createAdmin();
    $user = User::factory()->create();

    $this->actingAs($admin)->post(route('admin.users.password-reset', $user))->assertSessionHasNoErrors();
    $this->actingAs($admin)->post(route('admin.users.password-reset', $user))->assertSessionHasErrors('password_reset');

    Notification::assertSentToTimes($user, ResetPassword::class, 1);
});

test('sending password reset links requires the permission and a manageable user', function () {
    Notification::fake();
    $editor = userWithPermissions(['users.view', 'users.update'], 'User Editor');
    $target = User::factory()->create();

    $this->actingAs($editor)->post(route('admin.users.password-reset', $target))->assertForbidden();

    $resetter = userWithPermissions(['users.view', 'users.reset_password'], 'Resetter');
    $admin = User::factory()->create()->assignRole(SystemRole::ADMIN);

    $this->actingAs($resetter)->post(route('admin.users.password-reset', $admin))->assertForbidden();

    Notification::assertNothingSent();
});

test('non admins cannot edit admins or users with more access', function () {
    $editor = userWithPermissions(['users.view', 'users.update'], 'User Editor');
    $admin = User::factory()->create()->assignRole(SystemRole::ADMIN);
    Role::create(['name' => 'Role Admin'])->syncPermissions(['roles.delete']);
    $powerful = User::factory()->create()->assignRole('Role Admin');
    $peer = User::factory()->create()->givePermissionTo('users.view');

    foreach ([$admin, $powerful] as $target) {
        $this->actingAs($editor)->get(route('admin.users.edit', $target))->assertForbidden();
        $this->actingAs($editor)
            ->put(route('admin.users.update', $target), ['name' => 'Hijacked', 'email' => 'attacker@example.com', 'password' => 'attacker-password', 'password_confirmation' => 'attacker-password'])
            ->assertForbidden();

        expect($target->fresh()->email)->not->toBe('attacker@example.com');
    }

    $this->actingAs($editor)
        ->put(route('admin.users.update', $peer), ['name' => 'Peer', 'email' => $peer->email])
        ->assertSessionHasNoErrors();
});

test('an authorized user can delete a user and their data', function () {
    Storage::fake('s3');
    $admin = createAdmin();
    Role::create(['name' => 'Manager']);
    $user = User::factory()->create(['avatar_path' => 'settings/profile/avatar/me.png'])->assignRole('Manager');
    Storage::disk('s3')->put('settings/profile/avatar/me.png', 'image');
    notifyUser($user);

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $user))
        ->assertRedirect(route('admin.users.index'))
        ->assertSessionHasNoErrors();

    expect(User::find($user->id))->toBeNull()
        ->and(DB::table('model_has_roles')->where('model_id', $user->id)->count())->toBe(0)
        ->and(DB::table('notifications')->where('notifiable_id', $user->id)->count())->toBe(0);

    Storage::disk('s3')->assertMissing('settings/profile/avatar/me.png');
});

test('users cannot delete themselves, the last admin, or users with more access', function () {
    $admin = createAdmin();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $admin))
        ->assertSessionHasErrors('user');

    $deleter = userWithPermissions(['users.view', 'users.delete'], 'Deleter');

    $this->actingAs($deleter)
        ->delete(route('admin.users.destroy', $admin))
        ->assertSessionHasErrors(['user' => 'The last administrator cannot be deleted.']);

    $secondAdmin = User::factory()->create()->assignRole(SystemRole::ADMIN);

    $this->actingAs($deleter)
        ->delete(route('admin.users.destroy', $secondAdmin))
        ->assertSessionHasErrors(['user' => 'You cannot delete a user who has permissions you do not have.']);

    expect($admin->fresh())->not->toBeNull()
        ->and($secondAdmin->fresh())->not->toBeNull();

    $this->actingAs($admin)
        ->delete(route('admin.users.destroy', $secondAdmin))
        ->assertSessionHasNoErrors();

    expect($secondAdmin->fresh())->toBeNull();
});

test('user management actions require the matching permission', function () use ($newUser) {
    $viewer = userWithPermissions(['users.view']);
    $target = User::factory()->create();

    $this->actingAs($viewer)->get(route('admin.users.create'))->assertForbidden();
    $this->actingAs($viewer)->post(route('admin.users.store'), $newUser)->assertForbidden();
    $this->actingAs($viewer)->get(route('admin.users.edit', $target))->assertForbidden();
    $this->actingAs($viewer)->put(route('admin.users.update', $target), ['name' => 'X', 'email' => 'x@example.com'])->assertForbidden();
    $this->actingAs($viewer)->delete(route('admin.users.destroy', $target))->assertForbidden();

    expect(User::where('email', 'jane@example.com')->exists())->toBeFalse()
        ->and($target->fresh())->not->toBeNull();
});

test('the users list tells the UI which users can be managed', function () {
    $editor = userWithPermissions(['users.view', 'users.update'], 'User Editor');
    User::factory()->create(['name' => 'Aaron Admin'])->assignRole(SystemRole::ADMIN);

    $this->actingAs($editor)
        ->get(route('admin.users.index', ['search' => 'Aaron']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('users.data.0.can_manage', false)
            ->where('users.data.0.is_self', false),
        );
});
