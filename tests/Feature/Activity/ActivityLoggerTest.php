<?php

use App\Contracts\ActivityLoggerInterface;
use App\Models\Activity;
use App\Models\User;
use Spatie\Permission\Models\Role;

test('custom activities can be logged with a subject and metadata', function () {
    $user = User::factory()->create(['name' => 'Jane Doe']);
    $this->actingAs($user);

    $role = Role::create(['name' => 'Manager']);

    $activity = app(ActivityLoggerInterface::class)->log(
        action: 'exported',
        subject: $role,
        metadata: ['format' => 'csv'],
    );

    expect($activity->user_id)->toBe($user->id)
        ->and($activity->action)->toBe('exported')
        ->and($activity->subject_label)->toBe('Manager')
        ->and($activity->description)->toBe('Exported role Manager')
        ->and($activity->metadata)->toBe(['format' => 'csv'])
        ->and($activity->changed_fields)->toBeNull();
});

test('activities without a subject use the action as description', function () {
    $activity = app(ActivityLoggerInterface::class)->log(action: 'cache_cleared');

    expect($activity->description)->toBe('Cache cleared')
        ->and($activity->user_id)->toBeNull()
        ->and($activity->subject_type)->toBeNull();
});

test('activity records are immutable', function () {
    $activity = app(ActivityLoggerInterface::class)->log(action: 'exported', description: 'Exported report');

    expect(fn () => $activity->update(['description' => 'Tampered']))->toThrow(LogicException::class)
        ->and(fn () => $activity->delete())->toThrow(LogicException::class)
        ->and($activity->fresh()->description)->toBe('Exported report');
});

test('logging an activity never logs another activity', function () {
    app(ActivityLoggerInterface::class)->log(action: 'exported', description: 'Exported report');

    expect(Activity::query()->count())->toBe(1);
});

test('the request ip and user agent are recorded for http actions', function () {
    $user = User::factory()->create();

    $this->actingAs($user)
        ->withHeader('User-Agent', 'PestBrowser/1.0')
        ->put(route('user-password.update'), [
            'current_password' => 'password',
            'password' => 'new-password-123',
            'password_confirmation' => 'new-password-123',
        ]);

    $activity = Activity::query()->where('action', 'password_changed')->sole();

    expect($activity->user_id)->toBe($user->id)
        ->and($activity->ip_address)->toBe('127.0.0.1')
        ->and($activity->user_agent)->toBe('PestBrowser/1.0')
        ->and($activity->new_values)->toBeNull()
        ->and(json_encode($activity->toArray()))->not->toContain('new-password-123');
});

test('logins and logouts are recorded without secrets', function () {
    $user = User::factory()->create();

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password']);
    $this->post(route('logout'));

    $activities = Activity::query()->where('user_id', $user->id)->whereIn('action', ['login', 'logout'])->orderBy('id')->get();

    expect($activities->pluck('description')->all())->toBe(['Logged in', 'Logged out'])
        ->and(json_encode($activities->toArray()))->not->toContain('password');
});
