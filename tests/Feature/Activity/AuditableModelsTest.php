<?php

use App\Models\Activity;
use App\Models\Concerns\Auditable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use Symfony\Component\Finder\Finder;

/*
|--------------------------------------------------------------------------
| Activity log guard
|--------------------------------------------------------------------------
|
| Every application model must record its changes in the activity log. When
| this fails for a new model, add `use Auditable;` (and an activityLabel()).
| Only allowlist models that users never change, and say why.
|
*/

const NON_AUDITABLE_MODELS = [
    // The audit log itself: auditing it would recurse, and entries are immutable.
    Activity::class,
];

test('every application model records its changes in the activity log', function () {
    $models = collect(Finder::create()->files()->in(app_path('Models'))->depth(0)->name('*.php'))
        ->map(fn ($file) => 'App\\Models\\'.Str::beforeLast($file->getFilename(), '.php'))
        ->filter(fn (string $class) => class_exists($class) && is_subclass_of($class, Model::class))
        ->values();

    $missing = $models
        ->reject(fn (string $class) => in_array($class, NON_AUDITABLE_MODELS, true))
        ->reject(fn (string $class) => in_array(Auditable::class, class_uses_recursive($class), true))
        ->values()
        ->all();

    expect($models)->not->toBeEmpty()
        ->and($missing)->toBe([], "These models don't use Auditable:\n".implode("\n", $missing));
});
