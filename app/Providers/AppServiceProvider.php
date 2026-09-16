<?php

namespace App\Providers;

use App\Authorization\SystemRole;
use App\Contracts\ActivityLoggerInterface;
use App\Contracts\NotificationServiceInterface;
use App\Localization\JsonTranslator;
use App\Models\User;
use App\Services\ActivityLogger;
use App\Services\NotificationService;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;
use Illuminate\Translation\Translator;
use Illuminate\Validation\Rules\Password;

class AppServiceProvider extends ServiceProvider
{
    /**
     * All of the container bindings that should be registered.
     *
     * @var array<class-string, class-string>
     */
    public array $bindings = [
        NotificationServiceInterface::class => NotificationService::class,
        ActivityLoggerInterface::class => ActivityLogger::class,
    ];

    /**
     * Register any application services.
     */
    public function register(): void
    {
        // lang/{locale}.json is the only translation source; see JsonTranslator.
        $this->app->extend('translator', function (Translator $translator) {
            $json = new JsonTranslator($translator->getLoader(), $translator->getLocale());
            $json->setFallback($translator->getFallback());

            return $json;
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();
        $this->configureAuthorization();
        $this->configureAuthenticationMail();
    }

    /**
     * Password reset and email verification emails use the app's translation
     * keys. They are sent in the recipient's language (User::preferredLocale).
     */
    protected function configureAuthenticationMail(): void
    {
        ResetPassword::toMailUsing(function (object $notifiable, string $token) {
            /** @var User $notifiable */
            $url = url(route('password.reset', [
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ], false));

            return (new MailMessage)
                ->subject(__('mail.reset_password.subject'))
                ->line(__('mail.reset_password.intro'))
                ->action(__('mail.reset_password.action'), $url)
                ->line(__('mail.reset_password.expires', [
                    'count' => config('auth.passwords.'.config('auth.defaults.passwords').'.expire'),
                ]))
                ->line(__('mail.reset_password.outro'));
        });

        VerifyEmail::toMailUsing(fn (object $notifiable, string $url) => (new MailMessage)
            ->subject(__('mail.verify_email.subject'))
            ->line(__('mail.verify_email.intro'))
            ->action(__('mail.verify_email.action'), $url)
            ->line(__('mail.verify_email.outro')));
    }

    /**
     * Admins pass every Gate check (including permissions that were created
     * after the role was last synced). Everyone else goes through their
     * actual permissions and policies.
     */
    protected function configureAuthorization(): void
    {
        Gate::before(fn (mixed $user): ?bool => $user instanceof User && SystemRole::isAdmin($user) ? true : null);
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        if (app()->isProduction()) {
            URL::forceScheme('https');
        }

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
