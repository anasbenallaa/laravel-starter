<?php

use App\Localization\Locales;
use App\Models\User;
use Illuminate\Support\Facades\App;
use Inertia\Testing\AssertableInertia as Assert;

test('the default locale is english and left-to-right', function () {
    $this->get(route('login'))
        ->assertOk()
        ->assertSee('<html lang="en" dir="ltr"', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('localization.locale', 'en')
            ->where('localization.direction', 'ltr')
            ->where('localization.fallbackLocale', 'en')
            ->has('localization.supportedLocales', count(Locales::codes())));
});

test('guests can switch to french and it persists in the session', function () {
    $this->from(route('login'))
        ->post(route('locale.update'), ['locale' => 'fr'])
        ->assertRedirect(route('login'))
        ->assertSessionHas('locale', 'fr');

    $this->get(route('login'))
        ->assertSee('<html lang="fr" dir="ltr"', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('localization.locale', 'fr')
            ->where('localization.direction', 'ltr'));
});

test('arabic is right-to-left', function () {
    $this->post(route('locale.update'), ['locale' => 'ar']);

    $this->get(route('login'))
        ->assertSee('<html lang="ar" dir="rtl"', false)
        ->assertInertia(fn (Assert $page) => $page
            ->where('localization.locale', 'ar')
            ->where('localization.direction', 'rtl'));
});

test('unsupported locales are rejected', function (mixed $locale) {
    $this->from(route('login'))
        ->post(route('locale.update'), ['locale' => $locale])
        ->assertSessionHasErrors('locale');

    expect(session('locale'))->toBeNull();
})->with(['es', 'de', 'EN', 'en-US', '../en', '', null, 'array' => [['fr']]]);

test('a tampered session locale falls back to the default', function () {
    $this->withSession(['locale' => 'xx'])
        ->get(route('login'))
        ->assertInertia(fn (Assert $page) => $page->where('localization.locale', 'en'));
});

test('signed-in users save the locale to their own account', function () {
    $user = User::factory()->create(['locale' => 'en']);
    $other = User::factory()->create(['locale' => 'en']);

    $this->actingAs($user)
        ->from(route('dashboard'))
        ->post(route('locale.update'), ['locale' => 'ar', 'user_id' => $other->id])
        ->assertRedirect(route('dashboard'));

    expect($user->refresh()->locale)->toBe('ar')
        ->and($other->refresh()->locale)->toBe('en');
});

test('the saved user locale wins over the session', function () {
    $user = User::factory()->create(['locale' => 'fr']);

    $this->actingAs($user)
        ->withSession(['locale' => 'ar'])
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page
            ->where('localization.locale', 'fr')
            ->where('localization.direction', 'ltr'));
});

test('the locale persists across requests for signed-in users', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->post(route('locale.update'), ['locale' => 'fr']);

    // A new session: only the account remembers the choice.
    $this->flushSession();

    $this->actingAs($user->refresh())
        ->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('localization.locale', 'fr'));
});

test('the locale switch never redirects outside the application', function () {
    $this->withHeader('referer', 'https://evil.example/phish')
        ->post(route('locale.update'), ['locale' => 'fr'])
        ->assertRedirect(url('/').'/');
});

test('server messages use the active locale', function () {
    $this->post(route('locale.update'), ['locale' => 'fr']);

    $this->from(route('login'))
        ->post(route('login.store'), ['email' => 'nobody@example.com', 'password' => 'wrong-password'])
        ->assertSessionHasErrors(['email' => __('auth.failed', [], 'fr')]);

    expect(__('auth.failed', [], 'fr'))->not->toBe(__('auth.failed', [], 'en'));
});

test('validation attribute names are translated from the json files', function () {
    App::setLocale('fr');

    $validator = validator(['email' => ''], ['email' => 'required']);

    expect($validator->errors()->first('email'))->toBe('Le champ adresse e-mail est obligatoire.');
});

test('missing translations fall back to english', function () {
    App::setLocale('ar');

    // A language without a file uses the fallback (English) lines.
    expect(__('flash.user_created', [], 'xx'))->toBe(__('flash.user_created', [], 'en'))
        ->and(__('flash.user_created'))->not->toBe('flash.user_created');
});

test('a language picked on the login page is saved to the account on sign in', function () {
    $user = User::factory()->create(['locale' => 'en']);

    $this->post(route('locale.update'), ['locale' => 'ar']);

    $this->post(route('login.store'), ['email' => $user->email, 'password' => 'password'])
        ->assertRedirect(route('dashboard', absolute: false));

    expect($user->refresh()->locale)->toBe('ar');

    $this->get(route('dashboard'))
        ->assertInertia(fn (Assert $page) => $page->where('localization.direction', 'rtl'));
});

test('the language carried over after logout does not override the next user', function () {
    $first = User::factory()->create(['locale' => 'ar']);
    $second = User::factory()->create(['locale' => 'fr']);

    $this->actingAs($first)->post(route('logout'));
    $this->app['auth']->forgetGuards();

    $this->post(route('login.store'), ['email' => $second->email, 'password' => 'password']);

    expect($second->refresh()->locale)->toBe('fr');
});

test('logging out keeps the chosen language on the login page', function () {
    $user = User::factory()->create(['locale' => 'ar']);

    $this->actingAs($user)->post(route('logout'))->assertRedirect('/');

    $this->get(route('login'))
        ->assertInertia(fn (Assert $page) => $page->where('localization.locale', 'ar'));
});

test('registration adopts the language chosen before signing up', function () {
    $this->post(route('locale.update'), ['locale' => 'fr']);

    $this->post(route('register.store'), [
        'name' => 'Nadia',
        'email' => 'nadia@example.com',
        'password' => 'password',
        'password_confirmation' => 'password',
    ]);

    expect(User::query()->where('email', 'nadia@example.com')->value('locale'))->toBe('fr');
});

test('users prefer their saved locale for notifications and mail', function () {
    expect(User::factory()->make(['locale' => 'ar'])->preferredLocale())->toBe('ar')
        ->and(User::factory()->make(['locale' => 'zz'])->preferredLocale())->toBe('en');
});
