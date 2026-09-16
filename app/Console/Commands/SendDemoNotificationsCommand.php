<?php

namespace App\Console\Commands;

use App\Contracts\NotificationServiceInterface;
use App\Enums\NotificationLevel;
use App\Models\User;
use App\Notifications\ApplicationNotification;
use App\Notifications\Data\NotificationData;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

#[Signature('notifications:demo
    {user? : Email or ID of the recipient (defaults to the first user)}
    {--count= : Send only the first N sample notifications}
    {--level= : Only send samples of this level (info, success, warning, error)}
    {--read=3 : Mark this many of the oldest samples as read}
    {--now : Keep every notification at the current time instead of spreading them over the past days}
    {--queued : Send through the queue like the app does (needs a queue worker)}
    {--force : Allow running in production}')]
#[Description('Send sample notifications of every level to preview the notification bell and page')]
class SendDemoNotificationsCommand extends Command
{
    public function handle(NotificationServiceInterface $notifications): int
    {
        if ($this->laravel->isProduction() && ! $this->option('force')) {
            $this->components->error('Refusing to send demo notifications in production. Use --force to override.');

            return self::FAILURE;
        }

        $user = $this->recipient();

        if (! $user) {
            $this->components->error('No user found. Pass an existing email or ID, or create a user first.');

            return self::FAILURE;
        }

        $level = $this->option('level');

        if ($level !== null && NotificationLevel::tryFrom((string) $level) === null) {
            $this->components->error('The level must be one of: info, success, warning, error.');

            return self::FAILURE;
        }

        $samples = collect($this->samples())
            ->when($level !== null, fn ($samples) => $samples->filter(fn (array $sample) => $sample['data']->level->value === $level))
            ->when($this->option('count') !== null, fn ($samples) => $samples->take(max(0, (int) $this->option('count'))))
            ->values();

        $markAsRead = max(0, (int) $this->option('read'));
        $spread = ! $this->option('now') && ! $this->option('queued');

        foreach ($samples as $index => $sample) {
            // Oldest first, so the newest sample ends up at the top of the list.
            $sample = $samples[$samples->count() - 1 - $index];

            if ($this->option('queued')) {
                $notifications->send($user, $sample['data']);

                continue;
            }

            // Laravel sends a clone, so set the id up front to find the stored row.
            $notification = new ApplicationNotification($sample['data']);
            $notification->id = (string) Str::uuid();
            $user->notifyNow($notification);

            $stored = $user->notifications()->whereKey($notification->id)->first();

            $stored?->forceFill([
                'created_at' => $spread ? Carbon::now()->subMinutes($sample['minutes_ago']) : Carbon::now(),
                'updated_at' => Carbon::now(),
                'read_at' => $index < $markAsRead ? Carbon::now() : null,
            ])->save();
        }

        $this->components->info(sprintf('Sent %d demo notifications to %s.', $samples->count(), $user->email));

        if ($this->option('queued')) {
            $this->components->warn('Queued: they appear once a queue worker (e.g. Horizon) processes them.');
        }

        return self::SUCCESS;
    }

    private function recipient(): ?User
    {
        $identifier = $this->argument('user');

        if ($identifier === null) {
            return User::query()->oldest('id')->first();
        }

        return User::query()
            ->where('email', $identifier)
            ->when(ctype_digit((string) $identifier), fn ($query) => $query->orWhereKey((int) $identifier))
            ->first();
    }

    /**
     * Newest first. Covers every level, icons with and without a match, action
     * links, actors, subjects and a long message.
     *
     * @return list<array{data: NotificationData, minutes_ago: int}>
     */
    private function samples(): array
    {
        $dashboard = route('dashboard', absolute: false);
        $notificationsPage = route('notifications.index', absolute: false);
        $profile = route('profile.edit', absolute: false);

        return [
            [
                'minutes_ago' => 0,
                'data' => new NotificationData(
                    event: 'order.created',
                    title: 'New order received',
                    message: 'Order #1042 was placed and is waiting for review.',
                    level: NotificationLevel::Success,
                    icon: 'package',
                    actionUrl: $dashboard,
                    actionLabel: 'View order',
                    actorType: 'user',
                    actorName: 'Alex Kim',
                    subjectType: 'order',
                    subjectId: 1042,
                ),
            ],
            [
                'minutes_ago' => 2,
                'data' => new NotificationData(
                    event: 'integration.sync.failed',
                    title: 'Synchronization failed',
                    message: 'We could not synchronize your data. The remote server did not respond in time.',
                    level: NotificationLevel::Error,
                    icon: 'sync',
                    actionUrl: $notificationsPage,
                    actionLabel: 'See details',
                ),
            ],
            [
                'minutes_ago' => 25,
                'data' => new NotificationData(
                    event: 'system.warning',
                    title: 'Storage almost full',
                    message: 'You have used 92% of your storage quota. Remove old exports to free up space.',
                    level: NotificationLevel::Warning,
                ),
            ],
            [
                'minutes_ago' => 90,
                'data' => new NotificationData(
                    event: 'user.invited',
                    title: 'Teammate invited',
                    message: 'Sam Patel was invited to your workspace.',
                    icon: 'user-add',
                    actorType: 'user',
                    actorName: 'Sam Patel',
                ),
            ],
            [
                'minutes_ago' => 60 * 5,
                'data' => new NotificationData(
                    event: 'export.completed',
                    title: 'Export ready',
                    message: 'Your CSV export of 1,284 records is ready to download.',
                    level: NotificationLevel::Success,
                    icon: 'download',
                    actionUrl: $dashboard,
                    actionLabel: 'Download',
                ),
            ],
            [
                'minutes_ago' => 60 * 26,
                'data' => new NotificationData(
                    event: 'integration.disconnected',
                    title: 'Integration disconnected',
                    message: 'The connection to your accounting software expired. Reconnect it to keep invoices in sync.',
                    level: NotificationLevel::Warning,
                    icon: 'unlink',
                    actionUrl: $dashboard,
                    actionLabel: 'Reconnect',
                ),
            ],
            [
                'minutes_ago' => 60 * 30,
                'data' => new NotificationData(
                    event: 'payment.completed',
                    title: 'Payment received',
                    message: 'Invoice INV-2026-0098 was paid in full.',
                    level: NotificationLevel::Success,
                    icon: 'credit-card',
                ),
            ],
            [
                'minutes_ago' => 60 * 24 * 3,
                'data' => new NotificationData(
                    event: 'account.security',
                    title: 'New sign-in to your account',
                    message: 'Your account was accessed from a new device. If this was not you, change your password right away.',
                    level: NotificationLevel::Error,
                    icon: 'shield',
                    actionUrl: $profile,
                    actionLabel: 'Review security',
                ),
            ],
            [
                'minutes_ago' => 60 * 24 * 6,
                'data' => new NotificationData(
                    event: 'system.maintenance',
                    title: 'Scheduled maintenance',
                    message: 'The application will be briefly unavailable on Sunday between 02:00 and 03:00 UTC while we upgrade our infrastructure. Any work in progress will be saved automatically, and background jobs will resume once maintenance is complete.',
                    icon: 'settings',
                ),
            ],
            [
                'minutes_ago' => 60 * 24 * 12,
                'data' => new NotificationData(
                    event: 'system.info',
                    title: 'Welcome aboard',
                    message: 'Notifications about activity in your account will appear here.',
                ),
            ],
        ];
    }
}
