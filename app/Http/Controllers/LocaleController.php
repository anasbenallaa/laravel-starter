<?php

namespace App\Http\Controllers;

use App\Localization\Locales;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Validation\Rule;

class LocaleController extends Controller
{
    /**
     * Session flag: a guest picked this language, so it is saved to their
     * account when they sign in (see ApplyChosenLocale).
     */
    public const string CHOSEN_BY_GUEST = 'locale_chosen_by_guest';

    /**
     * Switch the interface language. Guests keep it in the session; signed-in
     * users also save it to their own account. Always redirects back (never to
     * a URL outside the application).
     */
    public function update(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in(Locales::codes())],
        ]);

        $locale = $validated['locale'];

        $request->session()->put('locale', $locale);

        if ($request->user()) {
            $request->user()->forceFill(['locale' => $locale])->save();
        } else {
            $request->session()->put(self::CHOSEN_BY_GUEST, true);
        }

        App::setLocale($locale);

        return redirect()->to($this->safePreviousUrl());
    }

    /**
     * The page the switch was made from, only when it belongs to this
     * application (the Referer header is client-controlled).
     */
    private function safePreviousUrl(): string
    {
        $previous = url()->previous();
        $root = rtrim(url('/'), '/');

        return $previous === $root || str_starts_with($previous, $root.'/') || str_starts_with($previous, $root.'?')
            ? $previous
            : $root.'/';
    }
}
