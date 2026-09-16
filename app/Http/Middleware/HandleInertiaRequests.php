<?php

namespace App\Http\Middleware;

use App\Authorization\SystemRole;
use App\Http\Resources\NotificationResource;
use App\Localization\Locales;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Middleware;
use Spatie\Permission\PermissionRegistrar;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that's loaded on the first page visit.
     *
     * @see https://inertiajs.com/server-side-setup#root-template
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determines the current asset version.
     *
     * @see https://inertiajs.com/asset-versioning
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @see https://inertiajs.com/shared-data
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        return [
            ...parent::share($request),
            'name' => config('app.name'),
            'auth' => [
                'user' => $request->user(),
                ...$this->authorization($request->user()),
            ],
            'localization' => [
                'locale' => app()->getLocale(),
                'direction' => Locales::direction(app()->getLocale()),
                'fallbackLocale' => Locales::default(),
                'supportedLocales' => Locales::options(),
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'notificationSummary' => fn () => $this->notificationSummary($request),
        ];
    }

    /**
     * The current user's role names and permission names, for hiding UI the
     * user can't use. Never trusted by the backend. Admins receive every
     * permission name from Spatie's cache, so no extra query is needed.
     *
     * @return array{roles: array<int, string>, permissions: array<int, string>, isAdmin: bool}
     */
    protected function authorization(?User $user): array
    {
        if (! $user) {
            return ['roles' => [], 'permissions' => [], 'isAdmin' => false];
        }

        $isAdmin = SystemRole::isAdmin($user);

        $permissions = $isAdmin
            ? app(PermissionRegistrar::class)->getPermissions()->pluck('name')
            : $user->getAllPermissions()->pluck('name');

        return [
            'roles' => $user->getRoleNames()->map(fn ($name) => (string) $name)->values()->all(),
            'permissions' => $permissions->map(fn ($name) => (string) $name)->sort()->values()->all(),
            'isAdmin' => $isAdmin,
        ];
    }

    /**
     * Header bell data: the unread count plus a handful of recent items.
     * Resolved lazily, so partial reloads that don't ask for it skip both
     * queries. The full list lives on the paginated notifications page.
     *
     * @return array{unreadCount: int, recent: array<int, mixed>}|null
     */
    protected function notificationSummary(Request $request): ?array
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        return [
            'unreadCount' => $user->unreadNotifications()->count(),
            'recent' => NotificationResource::collection(
                $user->notifications()->limit(5)->get(),
            )->resolve($request),
        ];
    }
}
