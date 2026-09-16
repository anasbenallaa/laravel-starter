<?php

namespace App\Notifications;

use App\Notifications\Data\NotificationData;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Notifications\Messages\BroadcastMessage;
use Illuminate\Notifications\Notification;

/**
 * The single notification class used by every feature. What happened is
 * described by its NotificationData, not by a per-feature PHP class.
 *
 * Queued (and dispatched only after the surrounding DB transaction commits)
 * so adding slow channels such as mail or broadcast never blocks a request.
 */
class ApplicationNotification extends Notification implements ShouldQueue
{
    use Queueable;

    public function __construct(public readonly NotificationData $data)
    {
        $this->afterCommit();
    }

    /**
     * Delivery channels.
     *
     * Real-time: once broadcasting (e.g. Reverb) is configured, add
     * 'broadcast' here. toBroadcast() and broadcastType() are already in place.
     *
     * @return list<string>
     */
    public function via(object $notifiable): array
    {
        return ['database'];
    }

    /**
     * Stored in notifications.type: the stable business event (e.g.
     * "order.created") instead of this generic class name.
     */
    public function databaseType(object $notifiable): string
    {
        return $this->data->event;
    }

    /**
     * @return array<string, mixed>
     */
    public function toDatabase(object $notifiable): array
    {
        return $this->data->toArray();
    }

    public function toBroadcast(object $notifiable): BroadcastMessage
    {
        return new BroadcastMessage($this->data->toArray());
    }

    public function broadcastType(): string
    {
        return $this->data->event;
    }
}
