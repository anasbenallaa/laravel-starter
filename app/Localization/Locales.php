<?php

namespace App\Localization;

/**
 * Read access to config/locales.php. Use this instead of hardcoding locale
 * codes; direction-specific logic should check direction(), never a code.
 */
final class Locales
{
    public static function default(): string
    {
        /** @var string */
        return config('locales.default', 'en');
    }

    /**
     * @return list<string>
     */
    public static function codes(): array
    {
        return array_keys(self::supported());
    }

    public static function isSupported(mixed $code): bool
    {
        return is_string($code) && array_key_exists($code, self::supported());
    }

    /**
     * The given code when supported, otherwise the default locale.
     */
    public static function resolve(mixed $code): string
    {
        return self::isSupported($code) ? $code : self::default();
    }

    /**
     * @return 'ltr'|'rtl'
     */
    public static function direction(string $code): string
    {
        return (self::supported()[$code]['direction'] ?? 'ltr') === 'rtl' ? 'rtl' : 'ltr';
    }

    /**
     * @return list<string>
     */
    public static function pluralForms(string $code): array
    {
        return self::supported()[$code]['plural_forms'] ?? ['one', 'other'];
    }

    /**
     * @return list<array{code: string, name: string, nativeName: string, direction: 'ltr'|'rtl'}>
     */
    public static function options(): array
    {
        return array_map(fn (string $code) => [
            'code' => $code,
            'name' => (string) self::supported()[$code]['name'],
            'nativeName' => (string) self::supported()[$code]['native_name'],
            'direction' => self::direction($code),
        ], self::codes());
    }

    /**
     * @return array<string, array{name: string, native_name: string, direction: string, plural_forms: list<string>}>
     */
    private static function supported(): array
    {
        /** @var array<string, array{name: string, native_name: string, direction: string, plural_forms: list<string>}> */
        return config('locales.supported', []);
    }
}
