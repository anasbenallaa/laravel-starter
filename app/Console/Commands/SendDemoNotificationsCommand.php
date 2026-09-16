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
     * links, actors, subjects and a long message. Every sample is translatable
     * (keys in lang/*.json under notifications.demo.*), so it renders in the
     * reader's language.
     *
     * @return list<array{data: NotificationData, minutes_ago: int}>
     */
    private function samples(): array
    {
        $dashboard = route('dashboard', absolute: false);
        $notificationsPage = route('notifications.index', absolute: false);
        $profile = route('profile.edit', absolute: false);

        $sample = fn (string $name, int $minutesAgo, array $data): array => [
            'minutes_ago' => $minutesAgo,
            'data' => new NotificationData(...[
                'titleKey' => "notifications.demo.{$name}.title",
                'messageKey' => "notifications.demo.{$name}.message",
                ...$data,
            ]),
        ];

        return [
            $sample('order_created', 0, [
                'event' => 'order.created',
                'level' => NotificationLevel::Success,
                'icon' => 'package',
                'actionUrl' => $dashboard,
                'actionLabelKey' => 'notifications.demo.order_created.action',
                'actorType' => 'user',
                'actorName' => 'Alex Kim',
                'subjectType' => 'order',
                'subjectId' => 1042,
                'parameters' => ['number' => 1042],
            ]),
            $sample('sync_failed', 2, [
                'event' => 'integration.sync.failed',
                'level' => NotificationLevel::Error,
                'icon' => 'sync',
                'actionUrl' => $notificationsPage,
                'actionLabelKey' => 'notifications.demo.sync_failed.action',
            ]),
            $sample('storage_warning', 25, [
                'event' => 'system.warning',
                'level' => NotificationLevel::Warning,
                'parameters' => ['percent' => 92],
            ]),
            $sample('user_invited', 90, [
                'event' => 'user.invited',
                'icon' => 'user-add',
                'actorType' => 'user',
                'actorName' => 'Sam Patel',
                'parameters' => ['name' => 'Sam Patel'],
            ]),
            $sample('export_completed', 60 * 5, [
                'event' => 'export.completed',
                'level' => NotificationLevel::Success,
                'icon' => 'download',
                'actionUrl' => $dashboard,
                'actionLabelKey' => 'notifications.demo.export_completed.action',
                'parameters' => ['count' => 1284],
            ]),
            $sample('integration_disconnected', 60 * 26, [
                'event' => 'integration.disconnected',
                'level' => NotificationLevel::Warning,
                'icon' => 'unlink',
                'actionUrl' => $dashboard,
                'actionLabelKey' => 'notifications.demo.integration_disconnected.action',
            ]),
            $sample('payment_completed', 60 * 30, [
                'event' => 'payment.completed',
                'level' => NotificationLevel::Success,
                'icon' => 'credit-card',
                'parameters' => ['invoice' => 'INV-2026-0098'],
            ]),
            $sample('new_sign_in', 60 * 24 * 3, [
                'event' => 'account.security',
                'level' => NotificationLevel::Error,
                'icon' => 'shield',
                'actionUrl' => $profile,
                'actionLabelKey' => 'notifications.demo.new_sign_in.action',
            ]),
            $sample('maintenance', 60 * 24 * 6, [
                'event' => 'system.maintenance',
                'icon' => 'settings',
            ]),
            $sample('welcome', 60 * 24 * 12, [
                'event' => 'system.info',
            ]),
        ];
    }
}
