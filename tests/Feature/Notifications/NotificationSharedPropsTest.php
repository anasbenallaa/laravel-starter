<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

test('the unread count and five most recent notifications are shared', function () {
    $user = User::factory()->create();

    foreach (range(1, 7) as $i) {
        $this->travel(1)->minutes();
        notifyUser($user, ['title' => "Notification {$i}"]);
    }

    $user->notifications()->reorder()->oldest()->first()->markAsRead();
    notifyUser(User::factory()->create());

    $this->actingAs($user)
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('notificationSummary.unreadCount', 6)
            ->has('notificationSummary.recent', 5)
            ->where('notificationSummary.recent.0.data.title', 'Notification 7')
            ->where('notificationSummary.recent.4.data.title', 'Notification 3'),
        );
});

test('guests receive no notification data', function () {
    $this->get(route('login'))
        ->assertInertia(fn (Assert $page) => $page->where('notificationSummary', null));
});

test('the summary does not collide with the notifications page props', function () {
    $user = User::factory()->create();
    notifyUser($user);

    $this->actingAs($user)
        ->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page
            ->has('notifications.data', 1)
            ->where('notificationSummary.unreadCount', 1)
            ->has('notificationSummary.recent', 1),
        );
});
