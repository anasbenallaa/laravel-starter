<?php

namespace App\Http\Controllers;

use App\Http\Resources\NotificationResource;
use App\Notifications\Data\NotificationData;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Notifications\DatabaseNotification;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class NotificationController extends Controller
{
    public const int PER_PAGE = 20;

    /**
     * @var list<string>
     */
    public const array FILTERS = ['all', 'unread', 'read'];

    /**
     * Show the authenticated user's notifications, newest first.
     */
    public function index(Request $request): Response
    {
        $filter = in_array($request->query('filter'), self::FILTERS, true)
            ? $request->query('filter')
            : 'all';

        $notifications = match ($filter) {
            'unread' => $request->user()->unreadNotifications(),
            'read' => $request->user()->readNotifications(),
            default => $request->user()->notifications(),
        };

        return Inertia::render('notifications', [
            'notifications' => NotificationResource::collection(
                $notifications->paginate(self::PER_PAGE)->withQueryString(),
            ),
            'filter' => $filter,
        ]);
    }

    /**
     * Mark a notification as read. With `follow`, redirect to the action URL
     * stored on the notification, so reading and navigating is one request.
     */
    public function markAsRead(Request $request, string $notification): SymfonyResponse
    {
        $notification = $this->findForUser($request, $notification);

        $notification->markAsRead();

        $url = data_get($notification->data, 'action.url');

        if ($request->boolean('follow') && is_string($url) && NotificationData::isSafeUrl($url)) {
            return $this->isInternalUrl($request, $url)
                ? redirect()->to($url)
                : Inertia::location($url);
        }

        return back();
    }

    /**
     * Mark a notification as unread.
     */
    public function markAsUnread(Request $request, string $notification): RedirectResponse
    {
        $this->findForUser($request, $notification)->markAsUnread();

        return back();
    }

    /**
     * Mark every unread notification of the user as read.
     */
    public function markAllAsRead(Request $request): RedirectResponse
    {
        $request->user()->unreadNotifications()->reorder()->update(['read_at' => now()]);

        return back();
    }

    /**
     * Delete a notification.
     */
    public function destroy(Request $request, string $notification): RedirectResponse
    {
        $this->findForUser($request, $notification)->delete();

        return back();
    }

    /**
     * Delete all of the user's read notifications.
     */
    public function destroyRead(Request $request): RedirectResponse
    {
        $request->user()->readNotifications()->reorder()->delete();

        return back();
    }

    /**
     * Always resolve through the authenticated user, so another user's
     * notification ID results in a 404 rather than being modified.
     */
    protected function findForUser(Request $request, string $id): DatabaseNotification
    {
        return $request->user()->notifications()->whereKey($id)->firstOrFail();
    }

    protected function isInternalUrl(Request $request, string $url): bool
    {
        return str_starts_with($url, '/')
            || parse_url($url, PHP_URL_HOST) === $request->getHost();
    }
}
