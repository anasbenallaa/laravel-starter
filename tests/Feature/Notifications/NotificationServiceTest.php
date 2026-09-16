<?php

use App\Contracts\NotificationServiceInterface;
use App\Enums\NotificationLevel;
use App\Models\User;
use App\Notifications\ApplicationNotification;
use App\Notifications\Data\NotificationData;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\SendQueuedNotifications;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Queue;

function syncFailedData(): NotificationData
{
    return new NotificationData(
        event: 'sync.failed',
        title: 'Synchronization failed',
        message: 'We could not synchronize your data.',
        level: NotificationLevel::Error,
    );
}

test('the service contract resolves to the notification service', function () {
    expect(app(NotificationServiceInterface::class))->toBeInstanceOf(NotificationService::class);
});

test('a notification is sent to the given recipient only', function () {
    Notification::fake();

    [$recipient, $other] = User::factory()->count(2)->create();

    app(NotificationServiceInterface::class)->send($recipient, syncFailedData());

    Notification::assertSentTo(
        $recipient,
        ApplicationNotification::class,
        fn (ApplicationNotification $notification, array $channels) => $notification->data->event === 'sync.failed'
            && $notification->data->level === NotificationLevel::Error
            && $channels === ['database'],
    );
    Notification::assertNotSentTo($other, ApplicationNotification::class);
});

test('the notification is stored with the event as its type', function () {
    $user = User::factory()->create();

    app(NotificationServiceInterface::class)->send($user, new NotificationData(
        event: 'order.created',
        title: 'New order',
        message: 'Order #123 has been created.',
        level: NotificationLevel::Success,
        actionUrl: '/orders/123',
        actionLabel: 'View order',
        subjectType: 'order',
        subjectId: 123,
    ));

    expect($user->notifications)->toHaveCount(1);

    $notification = $user->notifications->first();

    expect($notification->type)->toBe('order.created')
        ->and($notification->notifiable_type)->toBe($user->getMorphClass())
        ->and($notification->notifiable_id)->toBe($user->id)
        ->and($notification->read_at)->toBeNull()
        ->and($notification->data)->toMatchArray([
            'version' => 1,
            'event' => 'order.created',
            'category' => 'order',
            'level' => 'success',
            'title' => 'New order',
            'message' => 'Order #123 has been created.',
            'action' => ['label' => 'View order', 'url' => '/orders/123'],
            'subject' => ['type' => 'order', 'id' => 123],
        ]);
});

test('a notification can be sent to many recipients at once', function () {
    $recipients = User::factory()->count(3)->create();
    $bystander = User::factory()->create();

    app(NotificationServiceInterface::class)->sendToMany($recipients, syncFailedData());

    $recipients->each(fn (User $user) => expect($user->notifications()->count())->toBe(1));

    expect($bystander->notifications()->count())->toBe(0);
});

test('notifications are queued', function () {
    Queue::fake();

    $user = User::factory()->create();

    app(NotificationServiceInterface::class)->send($user, syncFailedData());

    expect(new ApplicationNotification(syncFailedData()))->toBeInstanceOf(ShouldQueue::class);

    Queue::assertPushed(SendQueuedNotifications::class);
    expect($user->notifications()->count())->toBe(0);
});

test('the broadcast payload matches the stored payload', function () {
    $user = User::factory()->create();
    $notification = new ApplicationNotification(syncFailedData());

    expect($notification->toBroadcast($user)->data)->toBe($notification->toDatabase($user))
        ->and($notification->broadcastType())->toBe('sync.failed');
});
