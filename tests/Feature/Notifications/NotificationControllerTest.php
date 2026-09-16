<?php

use App\Models\User;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

test('guests cannot access notifications', function () {
    $id = (string) Str::uuid();

    $this->get(route('notifications.index'))->assertRedirect(route('login'));
    $this->patch(route('notifications.read', $id))->assertRedirect(route('login'));
    $this->patch(route('notifications.unread', $id))->assertRedirect(route('login'));
    $this->patch(route('notifications.read-all'))->assertRedirect(route('login'));
    $this->delete(route('notifications.destroy', $id))->assertRedirect(route('login'));
    $this->delete(route('notifications.destroy-read'))->assertRedirect(route('login'));
});

test('the notifications page lists only the users notifications, newest first and paginated', function () {
    $user = User::factory()->create();

    foreach (range(1, 22) as $i) {
        $this->travel(1)->minutes();
        notifyUser($user, ['title' => "Notification {$i}"]);
    }

    notifyUser(User::factory()->create(), ['title' => 'Someone else']);

    $this->actingAs($user)
        ->get(route('notifications.index'))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('notifications')
            ->where('filter', 'all')
            ->has('notifications.data', 20)
            ->where('notifications.data.0.data.title', 'Notification 22')
            ->where('notifications.data.19.data.title', 'Notification 3')
            ->where('notifications.meta.total', 22)
            ->where('notifications.meta.last_page', 2)
            ->has('notifications.data.0', fn (Assert $item) => $item
                ->hasAll(['id', 'type', 'data', 'read_at', 'created_at'])
                ->missing('notifiable_id'),
            ),
        );

    $this->actingAs($user)
        ->get(route('notifications.index', ['page' => 2]))
        ->assertInertia(fn (Assert $page) => $page->has('notifications.data', 2));
});

test('notifications can be filtered by read state', function () {
    $user = User::factory()->create();

    notifyUser($user, ['title' => 'Unread one']);
    notifyUser($user, ['title' => 'Read one'])->markAsRead();

    $this->actingAs($user)
        ->get(route('notifications.index', ['filter' => 'unread']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filter', 'unread')
            ->has('notifications.data', 1)
            ->where('notifications.data.0.data.title', 'Unread one'),
        );

    $this->actingAs($user)
        ->get(route('notifications.index', ['filter' => 'read']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('notifications.data', 1)
            ->where('notifications.data.0.data.title', 'Read one'),
        );

    $this->actingAs($user)
        ->get(route('notifications.index', ['filter' => 'bogus']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('filter', 'all')
            ->has('notifications.data', 2),
        );
});

test('a user can mark their notification as read and unread', function () {
    $user = User::factory()->create();
    $notification = notifyUser($user);

    $this->actingAs($user)
        ->from(route('dashboard'))
        ->patch(route('notifications.read', $notification))
        ->assertRedirect(route('dashboard'));

    expect($notification->fresh()->read_at)->not->toBeNull();

    $this->actingAs($user)
        ->from(route('dashboard'))
        ->patch(route('notifications.unread', $notification))
        ->assertRedirect(route('dashboard'));

    expect($notification->fresh()->read_at)->toBeNull();
});

test('reading with follow redirects to the stored internal action url', function () {
    $user = User::factory()->create();
    $notification = notifyUser($user, ['actionUrl' => '/settings/profile']);

    $this->actingAs($user)
        ->from(route('dashboard'))
        ->patch(route('notifications.read', $notification), ['follow' => true])
        ->assertRedirect('/settings/profile');

    expect($notification->fresh()->read_at)->not->toBeNull();
});

test('reading with follow uses an inertia location visit for external urls', function () {
    $user = User::factory()->create();
    $notification = notifyUser($user, ['actionUrl' => 'https://status.example.com/incidents/1']);

    $this->actingAs($user)
        ->withHeader('X-Inertia', 'true')
        ->patch(route('notifications.read', $notification), ['follow' => true])
        ->assertStatus(409)
        ->assertHeader('X-Inertia-Location', 'https://status.example.com/incidents/1');
});

test('reading with follow stays on the page when there is no action url', function () {
    $user = User::factory()->create();
    $notification = notifyUser($user);

    $this->actingAs($user)
        ->from(route('notifications.index'))
        ->patch(route('notifications.read', $notification), ['follow' => true])
        ->assertRedirect(route('notifications.index'));
});

test('users cannot modify another users notifications', function () {
    $owner = User::factory()->create();
    $attacker = User::factory()->create();
    $notification = notifyUser($owner);

    $this->actingAs($attacker)->patch(route('notifications.read', $notification))->assertNotFound();
    expect($notification->fresh()->read_at)->toBeNull();

    $notification->markAsRead();

    $this->actingAs($attacker)->patch(route('notifications.unread', $notification))->assertNotFound();
    expect($notification->fresh()->read_at)->not->toBeNull();

    $this->actingAs($attacker)->delete(route('notifications.destroy', $notification))->assertNotFound();
    expect($notification->fresh())->not->toBeNull();
});

test('non uuid notification ids are not found', function () {
    $this->actingAs(User::factory()->create())
        ->patch('/notifications/123/read')
        ->assertNotFound();
});

test('a user can delete their notification', function () {
    $user = User::factory()->create();
    $notification = notifyUser($user);

    $this->actingAs($user)
        ->from(route('notifications.index'))
        ->delete(route('notifications.destroy', $notification))
        ->assertRedirect(route('notifications.index'));

    expect($notification->fresh())->toBeNull();
});

test('mark all as read only affects the current user', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    notifyUser($user);
    notifyUser($user);
    notifyUser($other);

    $this->actingAs($user)
        ->from(route('notifications.index'))
        ->patch(route('notifications.read-all'))
        ->assertRedirect(route('notifications.index'));

    expect($user->unreadNotifications()->count())->toBe(0)
        ->and($other->unreadNotifications()->count())->toBe(1);
});

test('clearing read notifications only deletes the current users read notifications', function () {
    $user = User::factory()->create();
    $other = User::factory()->create();

    notifyUser($user)->markAsRead();
    $unread = notifyUser($user);
    notifyUser($other)->markAsRead();

    $this->actingAs($user)
        ->from(route('notifications.index'))
        ->delete(route('notifications.destroy-read'))
        ->assertRedirect(route('notifications.index'));

    expect($user->notifications()->pluck('id')->all())->toBe([$unread->id])
        ->and($other->notifications()->count())->toBe(1);
});
