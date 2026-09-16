<?php

namespace App\Http\Middleware;

use App\Localization\Locales;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Date;
use Symfony\Component\HttpFoundation\Response;

/**
 * Sets the application locale for the request, before controllers, validation
 * and Inertia responses run. Priority: the signed-in user's saved language,
 * then the session (guests), then the default. Only supported codes are used.
 */
class SetLocale
{
    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolve($request);

        App::setLocale($locale);
        Date::setLocale($locale);

        return $next($request);
    }

    private function resolve(Request $request): string
    {
        $userLocale = $request->user()?->locale;

        if (Locales::isSupported($userLocale)) {
            return $userLocale;
        }

        return Locales::resolve($request->hasSession() ? $request->session()->get('locale') : null);
    }
}
