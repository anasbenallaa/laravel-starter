<?php

use App\Http\Controllers\Admin\RoleController;
use App\Http\Controllers\Admin\UserAccessController;
use App\Http\Controllers\Admin\UserController;
use Illuminate\Support\Facades\Route;

// Every route is guarded by the permission it needs, never by a role, so
// custom roles can be given administrative capabilities.
Route::middleware(['auth', 'verified'])->prefix('admin')->name('admin.')->group(function () {
    Route::get('users', [UserController::class, 'index'])
        ->middleware('can:users.view')
        ->name('users.index');
    Route::get('users/{user}/access', [UserAccessController::class, 'edit'])
        ->middleware('can:users.update')
        ->name('users.access.edit');
    Route::put('users/{user}/access', [UserAccessController::class, 'update'])
        ->middleware('can:users.update')
        ->name('users.access.update');

    // Roles & permissions page: requires roles.view or permissions.view,
    // checked in the controller because middleware can't express "either".
    Route::get('roles', [RoleController::class, 'index'])
        ->name('roles.index');
    Route::get('roles/create', [RoleController::class, 'create'])
        ->middleware('can:roles.create')
        ->name('roles.create');
    Route::post('roles', [RoleController::class, 'store'])
        ->middleware('can:roles.create')
        ->name('roles.store');
    Route::get('roles/{role}/edit', [RoleController::class, 'edit'])
        ->middleware('can:roles.update')
        ->name('roles.edit');
    Route::put('roles/{role}', [RoleController::class, 'update'])
        ->middleware('can:roles.update')
        ->name('roles.update');
    Route::delete('roles/{role}', [RoleController::class, 'destroy'])
        ->middleware('can:roles.delete')
        ->name('roles.destroy');
});
