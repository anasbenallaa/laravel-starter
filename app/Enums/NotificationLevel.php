<?php

namespace App\Enums;

/**
 * How important a notification is. Drives its icon and color in the UI.
 *
 * What actually happened is described by the free-form event string on
 * NotificationData, so new features never need to touch this enum.
 */
enum NotificationLevel: string
{
    case Info = 'info';
    case Success = 'success';
    case Warning = 'warning';
    case Error = 'error';
}
