<?php

use App\Authorization\PermissionRegistry;
use App\Models\User;
use Illuminate\Routing\Route as RoutingRoute;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Route permission guard
|--------------------------------------------------------------------------
|
| Every feature route must be protected by a permission. When this test fails
| for a new route, add `->middleware('can:resource.action')` (and register
| the permission in config/permissions.php). Only add a route to an allowlist
| below when it truly is personal to the signed-in user, and say why.
|
*/

/**
 * Routes that only act on the signed-in user's own data, so any
 * authenticated user may use them.
 */
const PERSONAL_ROUTES = [
    'dashboard',             // landing page
    'profile.*',             // own profile, avatar and account deletion
    'security.*',            // own password, 2FA and passkeys
    'user-password.*',       // own password
    'notifications.*',       // own notifications, scoped to the user in the controller
];

/** Unnamed personal routes, matched by URI. */
const PERSONAL_URIS = [
    'settings',              // redirect to settings/profile
];

/**
 * Routes that authorize inside the controller because middleware can't express
 * the rule (e.g. "either of two permissions"). Each one is checked to return 403
 * for a user without permissions.
 */
const CONTROLLER_AUTHORIZED_ROUTES = [
    'admin.roles.index' => ['roles.view', 'permissions.view'],
];

/** Authentication flows provided by packages; not application features. */
const PACKAGE_NAMESPACES = [
    'Laravel\\Fortify\\',
    'Laravel\\Passkeys\\',
];

/**
 * @return Collection<int, RoutingRoute>
 */
function authenticatedApplicationRoutes(): Collection
{
    return collect(Route::getRoutes()->getRoutes())
        ->filter(fn (RoutingRoute $route) => collect($route->gatherMiddleware())
            ->contains(fn ($middleware) => is_string($middleware) && ($middleware === 'auth' || str_starts_with($middleware, 'auth:'))))
        ->reject(fn (RoutingRoute $route) => Str::startsWith(ltrim($route->getActionName(), '\\'), PACKAGE_NAMESPACES))
        ->values();
}

/**
 * @return list<string>
 */
function routePermissions(RoutingRoute $route): array
{
    return collect($route->gatherMiddleware())
        ->filter(fn ($middleware) => is_string($middleware) && str_starts_with($middleware, 'can:'))
        ->map(fn (string $middleware) => explode(',', Str::after($middleware, 'can:'))[0])
        ->values()
        ->all();
}

test('every authenticated feature route requires a permission', function () {
    $unprotected = authenticatedApplicationRoutes()
        ->reject(fn (RoutingRoute $route) => routePermissions($route) !== [])
        ->reject(fn (RoutingRoute $route) => $route->getName() !== null && Str::is(PERSONAL_ROUTES, $route->getName()))
        ->reject(fn (RoutingRoute $route) => in_array($route->uri(), PERSONAL_URIS, true))
        ->reject(fn (RoutingRoute $route) => array_key_exists((string) $route->getName(), CONTROLLER_AUTHORIZED_ROUTES))
        ->map(fn (RoutingRoute $route) => implode('|', $route->methods()).' /'.$route->uri().' ('.($route->getName() ?? 'unnamed').')')
        ->values()
        ->all();

    expect($unprotected)->toBe([], "These routes have no `can:` permission middleware:\n".implode("\n", $unprotected));
});

test('every permission used by a route is registered in config/permissions.php', function () {
    $configured = PermissionRegistry::configured();

    $unknown = authenticatedApplicationRoutes()
        ->flatMap(fn (RoutingRoute $route) => collect(routePermissions($route))
            ->map(fn (string $permission) => [$permission, "/{$route->uri()}"]))
        ->merge(collect(CONTROLLER_AUTHORIZED_ROUTES)
            ->flatMap(fn (array $permissions, string $name) => collect($permissions)->map(fn (string $permission) => [$permission, $name])))
        ->reject(fn (array $usage) => in_array($usage[0], $configured, true))
        ->map(fn (array $usage) => "{$usage[0]} on {$usage[1]}")
        ->values()
        ->all();

    expect($unknown)->toBe([], "Register these permissions in config/permissions.php:\n".implode("\n", $unknown));
});

test('controller authorized routes deny users without permissions', function (string $routeName) {
    seedAccessControl();

    $this->actingAs(User::factory()->create())
        ->get(route($routeName))
        ->assertForbidden();
})->with(array_keys(CONTROLLER_AUTHORIZED_ROUTES));
