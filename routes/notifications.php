<?php

use App\Http\Controllers\NotificationController;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('notifications', [NotificationController::class, 'index'])->name('notifications.index');

    Route::patch('notifications/read-all', [NotificationController::class, 'markAllAsRead'])->name('notifications.read-all');
    Route::delete('notifications/read', [NotificationController::class, 'destroyRead'])->name('notifications.destroy-read');

    Route::patch('notifications/{notification}/read', [NotificationController::class, 'markAsRead'])
        ->whereUuid('notification')
        ->name('notifications.read');
    Route::patch('notifications/{notification}/unread', [NotificationController::class, 'markAsUnread'])
        ->whereUuid('notification')
        ->name('notifications.unread');
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy'])
        ->whereUuid('notification')
        ->name('notifications.destroy');
});
