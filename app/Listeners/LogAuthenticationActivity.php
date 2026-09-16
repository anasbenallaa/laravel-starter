<?php

namespace App\Listeners;

use App\Activity\ActivityAction;
use App\Contracts\ActivityLoggerInterface;
use App\Models\User;
use Illuminate\Auth\Events\Login;
use Illuminate\Auth\Events\Logout;

/**
 * Records sign-ins and sign-outs. Only the user and request IP/user agent are
 * stored; never passwords, session ids, cookies or tokens.
 */
class LogAuthenticationActivity
{
    public function __construct(private ActivityLoggerInterface $logger) {}

    public function handleLogin(Login $event): void
    {
        if ($event->user instanceof User) {
            $this->logger->log(action: ActivityAction::LOGIN, description: 'Logged in', actor: $event->user);
        }
    }

    public function handleLogout(Logout $event): void
    {
        if ($event->user instanceof User) {
            $this->logger->log(action: ActivityAction::LOGOUT, description: 'Logged out', actor: $event->user);
        }
    }
}
