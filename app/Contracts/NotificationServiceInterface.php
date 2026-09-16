<?php

namespace App\Contracts;

use App\Notifications\Data\NotificationData;
use Illuminate\Database\Eloquent\Model;

/**
 * Entry point for sending application notifications from any feature.
 * Channel delivery (database today; broadcast, mail, ... later) stays the
 * responsibility of Laravel's notification system.
 */
interface NotificationServiceInterface
{
    /**
     * Notify a single notifiable model (usually a User).
     */
    public function send(Model $recipient, NotificationData $data): void;

    /**
     * Notify many recipients with the same payload.
     *
     * @param  iterable<Model>  $recipients
     */
    public function sendToMany(iterable $recipients, NotificationData $data): void;
}
