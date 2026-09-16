<?php

namespace App\Http\Middleware;

use App\Http\Resources\NotificationResource;
use Illuminate\Http\Request;
use Inertia\Middleware;

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
            ],
            'sidebarOpen' => ! $request->hasCookie('sidebar_state') || $request->cookie('sidebar_state') === 'true',
            'notificationSummary' => fn () => $this->notificationSummary($request),
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
