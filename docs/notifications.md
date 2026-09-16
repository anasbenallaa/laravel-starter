# Notifications

One generic, in-app notification system for every feature. It is built on
Laravel's native notifications: one `notifications` table, one notification
class, and a free-form **event** string that says what happened.

## Sending a notification

Inject `App\Contracts\NotificationServiceInterface` and pass a
`NotificationData` payload.

Only `event`, `title` and `message` are required. `level` defaults to `info`.

### Order created

```php
use App\Contracts\NotificationServiceInterface;
use App\Enums\NotificationLevel;
use App\Notifications\Data\NotificationData;

class CreateOrder
{
    public function __construct(private NotificationServiceInterface $notifications) {}

    public function handle(User $customer, array $input): Order
    {
        $order = /* ... */;

        $this->notifications->send($customer, new NotificationData(
            event: 'order.created',
            title: 'New order',
            message: "Order #{$order->id} has been created.",
            level: NotificationLevel::Success,
            icon: 'package',
            actionUrl: route('orders.show', $order, absolute: false),
            actionLabel: 'View order',
            subjectType: 'order',
            subjectId: $order->id,
        ));

        return $order;
    }
}
```

### Background sync completed

```php
$notifications->send($user, new NotificationData(
    event: 'sync.completed',
    title: 'Synchronization completed',
    message: 'Your data has been synchronized successfully.',
    level: NotificationLevel::Success,
    icon: 'sync',
));
```

### Background sync failed (from a queued job)

```php
public function failed(Throwable $exception): void
{
    app(NotificationServiceInterface::class)->send($this->user, new NotificationData(
        event: 'sync.failed',
        title: 'Synchronization failed',
        message: 'We could not synchronize your data.',
        level: NotificationLevel::Error,
        icon: 'sync',
        metadata: ['attempts' => $this->attempts()],
    ));
}
```

### Many recipients

```php
$notifications->sendToMany(
    $team->users,
    new NotificationData(event: 'system.warning', title: 'Scheduled maintenance', message: 'The app will be offline Sunday 02:00–03:00 UTC.', level: NotificationLevel::Warning),
);
```

## Previewing the design with demo notifications

`notifications:demo` sends 10 sample notifications to a user, so you can check
the bell dropdown and the notifications page. The samples cover every level
(info, success, warning, error), several icons, action links, actors, a long
message and a notification with no icon. They are spread from "Just now" back
to last week, and the oldest 3 are marked as read.

```bash
php artisan notifications:demo                                 # first user
php artisan notifications:demo admin@example.com               # by email (or ID)
php artisan notifications:demo --level=error --read=0          # only error samples, all unread
php artisan notifications:demo --count=3 --now                 # 3 samples, all at the current time
php artisan notifications:demo --queued                        # through the queue like the app (needs Horizon/worker)
```

With Docker, run it inside the app container:
`docker compose -f docker-compose.local.yml exec app php artisan notifications:demo you@example.com`.

- By default notifications are delivered immediately (no queue worker needed).
- The command refuses to run in production unless `--force` is passed.
- Use **Clear read** or **Mark all as read** on the notifications page to reset
  between runs.

## Payload reference

| Field                               | Required | Notes                                                                                                              |
| ----------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------ |
| `event`                             | yes      | Lowercase and dot-separated, e.g. `integration.sync.failed`. It is also stored as `notifications.type`.            |
| `title`, `message`                  | yes      | Must not be blank.                                                                                                 |
| `level`                             | no       | `info` (default), `success`, `warning` or `error`. It sets the color and the fallback icon.                        |
| `category`                          | no       | Defaults to the first segment of the event (`order` for `order.created`).                                          |
| `icon`                              | no       | A name from `notificationIcons` in `resources/js/lib/notifications.ts`. Unknown names fall back to the level icon. |
| `actionUrl`, `actionLabel`          | no       | A relative path (preferred) or an `http(s)` URL. Other schemes are rejected.                                       |
| `actorType`, `actorId`, `actorName` | no       | Who caused the event.                                                                                              |
| `subjectType`, `subjectId`          | no       | What the event is about.                                                                                           |
| `metadata`                          | no       | Extra feature-specific data.                                                                                       |

> **Warning:** the whole payload, including `metadata`, is sent to the
> recipient's browser. Never put secrets, tokens or other users' private data
> in it.

To add a new event, pick a new event string. You don't need an enum case, a
migration or a new class. To add a new icon, add one entry to
`notificationIcons`.

## Delivery and queues

`ApplicationNotification` implements `ShouldQueue` and is dispatched after the
surrounding database transaction commits. Horizon processes it on the
`default` queue. In tests, `QUEUE_CONNECTION=sync` delivers it immediately.

## Adding real-time (broadcast) later

1. Install and configure broadcasting (`php artisan install:broadcasting`,
   e.g. with Reverb).
2. In `ApplicationNotification::via()`, return `['database', 'broadcast']`.
   `toBroadcast()` and `broadcastType()` already send the same payload.
3. On the frontend, listen on the user's private channel with
   `useEchoNotification` from `@laravel/echo-react`. When a notification
   arrives, call `router.reload({ only: ['notificationSummary'] })`.

Mail, Slack and SMS work the same way: add the channel to `via()` and a
matching `toMail()` (or similar) method. `NotificationService` doesn't change.

## HTTP endpoints

Every endpoint requires an authenticated, verified user. Every lookup goes
through `$request->user()->notifications()`, so another user's ID returns 404.

| Method | URI                                                                        | Name                         |
| ------ | -------------------------------------------------------------------------- | ---------------------------- |
| GET    | `/notifications?filter=all\|unread\|read`                                  | `notifications.index`        |
| PATCH  | `/notifications/{id}/read` (`follow=1` redirects to the stored action URL) | `notifications.read`         |
| PATCH  | `/notifications/{id}/unread`                                               | `notifications.unread`       |
| PATCH  | `/notifications/read-all`                                                  | `notifications.read-all`     |
| DELETE | `/notifications/{id}`                                                      | `notifications.destroy`      |
| DELETE | `/notifications/read`                                                      | `notifications.destroy-read` |

Every Inertia response for a signed-in user shares `notificationSummary`,
which holds `{ unreadCount, recent }` (the latest 5). It is resolved lazily.
