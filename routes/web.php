<?php

use App\Http\Controllers\GlobalSearchController;
use Illuminate\Support\Facades\Route;

Route::redirect('/', '/login')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'dashboard')->name('dashboard');

    // Command palette search; each result group checks its own permission.
    Route::get('search', GlobalSearchController::class)
        ->middleware('throttle:60,1')
        ->name('search');
});

require __DIR__.'/settings.php';
require __DIR__.'/notifications.php';
require __DIR__.'/admin.php';
