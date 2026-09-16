<?php

use App\Http\Controllers\ActivityController;
use App\Http\Controllers\GlobalSearchController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Read-only activity history: own activity, or everyone's with
    // activities.view.all (checked in the controller). No write routes exist.
    Route::get('activities', [ActivityController::class, 'index'])->name('activities.index');
    Route::get('activities/export', [ActivityController::class, 'export'])
        ->middleware('throttle:10,1')
        ->name('activities.export');

    // Command palette search; each result group checks its own permission.
    Route::get('search', GlobalSearchController::class)
        ->middleware('throttle:60,1')
        ->name('search');
});

require __DIR__.'/settings.php';
require __DIR__.'/notifications.php';
require __DIR__.'/admin.php';
