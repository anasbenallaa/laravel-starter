<?php

use App\Models\User;
use App\Notifications\ApplicationNotification;
use Illuminate\Support\Facades\Notification;

test('it sends every sample notification to the first user by default', function () {
    $user = User::factory()->create();
    User::factory()->create();

    $this->artisan('notifications:demo')
        ->expectsOutputToContain("Sent 10 demo notifications to {$user->email}.")
        ->assertSuccessful();

    $notifications = $user->notifications()->get();

    expect($notifications)->toHaveCount(10)
        ->and($notifications->pluck('data.level')->unique()->sort()->values()->all())->toBe(['error', 'info', 'success', 'warning'])
        ->and($notifications->first()->data['title'])->toBe('New order received')
        ->and($notifications->first()->created_at->diffInMinutes(now()))->toBeLessThan(1)
        ->and($notifications->last()->created_at->lt(now()->subDays(7)))->toBeTrue()
        ->and($user->unreadNotifications()->count())->toBe(7)
        ->and($user->readNotifications()->get()->pluck('data.title')->all())->toContain('Welcome aboard');
});

test('it targets a user by email or id and can filter the samples', function () {
    $first = User::factory()->create();
    $target = User::factory()->create(['email' => 'target@example.com']);

    $this->artisan('notifications:demo', ['user' => 'target@example.com', '--level' => 'error', '--read' => 0])
        ->assertSuccessful();

    expect($target->notifications()->count())->toBe(2)
        ->and($target->notifications()->get()->pluck('data.level')->unique()->all())->toBe(['error'])
        ->and($target->unreadNotifications()->count())->toBe(2)
        ->and($first->notifications()->count())->toBe(0);

    $this->artisan('notifications:demo', ['user' => (string) $first->id, '--count' => 3, '--now' => true])
        ->assertSuccessful();

    expect($first->notifications()->count())->toBe(3)
        ->and($first->notifications()->get()->every(fn ($notification) => $notification->created_at->diffInMinutes(now()) < 1))->toBeTrue();
});

test('it can go through the regular queued notification service', function () {
    Notification::fake();
    $user = User::factory()->create();

    $this->artisan('notifications:demo', ['--queued' => true, '--count' => 2])->assertSuccessful();

    Notification::assertSentToTimes($user, ApplicationNotification::class, 2);
});

test('it rejects unknown users and levels', function () {
    User::factory()->create();

    $this->artisan('notifications:demo', ['user' => 'nobody@example.com'])->assertFailed();
    $this->artisan('notifications:demo', ['--level' => 'critical'])->assertFailed();
});

test('it refuses to run in production without force', function () {
    $user = User::factory()->create();
    app()->detectEnvironment(fn () => 'production');

    $this->artisan('notifications:demo')->assertFailed();

    expect($user->notifications()->count())->toBe(0);

    $this->artisan('notifications:demo', ['--force' => true, '--count' => 1])->assertSuccessful();

    expect($user->notifications()->count())->toBe(1);
});
