<?php

namespace App\Listeners;

use App\Http\Controllers\LocaleController;
use App\Localization\Locales;
use App\Models\User;
use Illuminate\Auth\Events\Login;

/**
 * A language picked on the guest pages (e.g. the login screen) is an explicit
 * choice: save it to the account when that person signs in. The language that
 * is only carried over after logging out is not a choice and never overrides
 * the next user's saved preference.
 */
class ApplyChosenLocale
{
    public function handle(Login $event): void
    {
        $request = request();

        if (! $event->user instanceof User || ! $request->hasSession()) {
            return;
        }

        $session = $request->session();

        if (! $session->pull(LocaleController::CHOSEN_BY_GUEST, false)) {
            return;
        }

        $locale = $session->get('locale');

        if (Locales::isSupported($locale) && $event->user->locale !== $locale) {
            $event->user->forceFill(['locale' => $locale])->save();
        }
    }
}
