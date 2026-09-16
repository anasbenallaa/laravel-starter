<?php

namespace App\Services;

use App\Contracts\NotificationServiceInterface;
use App\Notifications\ApplicationNotification;
use App\Notifications\Data\NotificationData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Notification;

class NotificationService implements NotificationServiceInterface
{
    public function send(Model $recipient, NotificationData $data): void
    {
        Notification::send($recipient, new ApplicationNotification($data));
    }

    public function sendToMany(iterable $recipients, NotificationData $data): void
    {
        Notification::send(collect($recipients), new ApplicationNotification($data));
    }
}
