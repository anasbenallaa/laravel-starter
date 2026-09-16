<?php

namespace App\Http\Responses;

use App\Localization\Locales;
use Illuminate\Http\RedirectResponse;
use Laravel\Fortify\Contracts\LogoutResponse as LogoutResponseContract;

/**
 * Logging out invalidates the session; keep the interface language for the
 * guest pages that follow (login), so the user doesn't drop back to English.
 */
class LogoutResponse implements LogoutResponseContract
{
    public function toResponse($request): RedirectResponse
    {
        $request->session()->put('locale', Locales::resolve(app()->getLocale()));

        return redirect('/');
    }
}
