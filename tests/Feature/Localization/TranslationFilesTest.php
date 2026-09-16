<?php

use App\Authorization\PermissionRegistry;
use App\Localization\Locales;
use Illuminate\Support\Collection;
use Symfony\Component\Finder\Finder;

/*
|--------------------------------------------------------------------------
| Translation files guard
|--------------------------------------------------------------------------
|
| lang/en.json is the canonical file. Every supported locale must have the
| same keys, the same placeholders and the plural forms its language needs.
| When this fails after adding text, add the key to every lang/*.json file.
|
*/

const PLURAL_SUFFIX = '/^(.+)_(zero|one|two|few|many|other)$/';

/**
 * Messages owned by packages (Fortify, Passkeys) that translate their English
 * text directly. They are the only keys allowed to be sentences.
 */
const PACKAGE_LITERAL_KEYS = [
    'The provided password was incorrect.',
    'The provided two factor authentication code was invalid.',
    'The provided two factor recovery code was invalid.',
    'Invalid credential format.',
    'Passkey registration session expired. Please try again.',
    'Passkey verification session expired. Please try again.',
];

/**
 * @return array<string, string>
 */
function translations(string $locale): array
{
    $path = lang_path("{$locale}.json");

    expect($path)->toBeFile("lang/{$locale}.json is missing.");

    return json_decode((string) file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
}

/**
 * Keys grouped by base key: plural keys ("users.count_one") under their base
 * ("users.count") with their forms, other keys with no forms.
 *
 * @param  array<string, string>  $lines
 * @return array<string, list<string>>
 */
function baseKeys(array $lines): array
{
    $bases = [];

    foreach (array_keys($lines) as $key) {
        if (preg_match(PLURAL_SUFFIX, $key, $match) && isset($lines["{$match[1]}_other"])) {
            $bases[$match[1]][] = $match[2];
        } else {
            $bases[$key] ??= [];
        }
    }

    return $bases;
}

/**
 * i18next ({{name}}, {{name, format}}) and Laravel (:name) placeholders.
 *
 * @return list<string>
 */
function placeholders(string $text): array
{
    preg_match_all('/\{\{\s*(\w+)\s*(?:,[^}]*)?\}\}/', $text, $i18next);
    preg_match_all('/(?<![\w:\/]):([a-z][a-zA-Z_]*)/', $text, $laravel);

    $names = array_values(array_unique([...$i18next[1], ...$laravel[1]]));
    sort($names);

    return $names;
}

/**
 * Placeholders of a base key across its plural forms (or the line itself).
 *
 * @param  array<string, string>  $lines
 * @param  list<string>  $forms
 * @return list<string>
 */
function basePlaceholders(array $lines, string $base, array $forms): array
{
    $texts = $forms === [] ? [$lines[$base]] : array_map(fn (string $form) => $lines["{$base}_{$form}"], $forms);
    $names = array_values(array_unique(array_merge(...array_map(placeholders(...), $texts))));
    sort($names);

    return $names;
}

// Read from the config file directly: datasets resolve before the app boots.
dataset('locales', array_keys((require dirname(__DIR__, 3).'/config/locales.php')['supported']));

test('every supported locale has a lang file and there are no unknown files', function () {
    $files = collect(glob(lang_path('*.json')))->map(fn (string $path) => basename($path, '.json'))->sort()->values()->all();
    $codes = collect(Locales::codes())->sort()->values()->all();

    expect($files)->toBe($codes);
});

test('supported locales are configured completely', function (string $locale) {
    expect(Locales::direction($locale))->toBeIn(['ltr', 'rtl'])
        ->and(Locales::pluralForms($locale))->toContain('other')
        ->and(collect(Locales::options())->firstWhere('code', $locale))->not->toBeNull();
})->with('locales');

test('lang files are valid json objects of strings', function (string $locale) {
    $lines = translations($locale);

    expect($lines)->toBeArray()->not->toBeEmpty();

    foreach ($lines as $key => $value) {
        expect($key)->toBeString()
            ->and($value)->toBeString("[{$locale}] {$key} must be a string.")
            ->and(trim($value))->not->toBe('', "[{$locale}] {$key} is empty.");
    }
})->with('locales');

test('lang files have no duplicate keys', function (string $locale) {
    preg_match_all('/^\s*"((?:[^"\\\\]|\\\\.)*)"\s*:/m', (string) file_get_contents(lang_path("{$locale}.json")), $matches);

    $duplicates = collect($matches[1])->countBy()->filter(fn (int $count) => $count > 1)->keys()->all();

    expect($duplicates)->toBe([], "[{$locale}] duplicate keys: ".implode(', ', $duplicates));
})->with('locales');

test('keys are semantic dotted identifiers', function () {
    $invalid = collect(array_keys(translations('en')))
        ->reject(fn (string $key) => preg_match('/^[a-z0-9_]+(\.[a-z0-9_]+)+$/', $key) === 1 || in_array($key, PACKAGE_LITERAL_KEYS, true))
        ->values()
        ->all();

    expect($invalid)->toBe([], 'Use dotted keys like "users.index.title": '.implode(', ', $invalid));
});

test('every locale has exactly the english keys', function (string $locale) {
    $english = baseKeys(translations('en'));
    $other = baseKeys(translations($locale));

    $missing = array_values(array_diff(array_keys($english), array_keys($other)));
    $extra = array_values(array_diff(array_keys($other), array_keys($english)));

    expect($missing)->toBe([], "[{$locale}] missing keys: ".implode(', ', $missing))
        ->and($extra)->toBe([], "[{$locale}] keys not in en.json: ".implode(', ', $extra));
})->with('locales');

test('plural keys have exactly the forms their language needs', function (string $locale) {
    $english = baseKeys(translations('en'));
    $required = Locales::pluralForms($locale);
    sort($required);

    $wrong = collect(baseKeys(translations($locale)))
        ->filter(fn (array $forms, string $base) => ($english[$base] ?? []) !== [] || $forms !== [])
        ->map(function (array $forms) {
            sort($forms);

            return $forms;
        })
        ->reject(fn (array $forms) => $forms === $required)
        ->map(fn (array $forms, string $base) => "{$base} (".implode(', ', $forms).')')
        ->values()
        ->all();

    expect($wrong)->toBe([], "[{$locale}] plural keys need the forms ".implode(', ', $required).': '.implode('; ', $wrong));
})->with('locales');

test('translations keep the english placeholders', function (string $locale) {
    $englishLines = translations('en');
    $lines = translations($locale);
    $english = baseKeys($englishLines);

    $mismatches = collect(baseKeys($lines))
        ->filter(fn (array $forms, string $base) => array_key_exists($base, $english))
        ->map(function (array $forms, string $base) use ($lines, $englishLines, $english) {
            $expected = basePlaceholders($englishLines, $base, $english[$base]);
            $actual = basePlaceholders($lines, $base, $forms);
            $isChoice = $forms !== [] || str_contains($lines[$base] ?? '', '|');

            // Plural and choice lines may omit the count ("one user"), never add names.
            $valid = $isChoice
                ? array_diff($actual, $expected) === [] && array_diff($expected, $actual, ['count']) === []
                : $actual === $expected;

            return $valid ? null : "{$base}: expected [".implode(', ', $expected).'], got ['.implode(', ', $actual).']';
        })
        ->filter()
        ->values()
        ->all();

    expect($mismatches)->toBe([], "[{$locale}] placeholder mismatches:\n".implode("\n", $mismatches));
})->with('locales');

test('every configured permission has a translated label and resource', function () {
    $lines = translations('en');

    $missing = collect(PermissionRegistry::configured())
        ->flatMap(fn (string $permission) => [
            "permissions.label.{$permission}",
            'permissions.resource.'.explode('.', $permission)[0],
        ])
        ->unique()
        ->reject(fn (string $key) => array_key_exists($key, $lines))
        ->values()
        ->all();

    expect($missing)->toBe([], 'Add these keys to every lang/*.json file: '.implode(', ', $missing));
});

test('every translation key used in the code exists', function () {
    $lines = translations('en');
    $bases = baseKeys($lines);

    /** @var Collection<int, string> $used */
    $used = collect();

    $scan = function (string $directory, array $patterns, string $regex) use ($used) {
        foreach (Finder::create()->files()->in($directory)->name($patterns) as $file) {
            preg_match_all($regex, $file->getContents(), $matches);
            $used->push(...$matches[1]);
        }
    };

    // t('key'), t("key") and i18nKey — literal keys only; template keys are dynamic.
    $scan(resource_path('js'), ['*.ts', '*.tsx'], '/\bt\(\s*[\'"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)[\'"]/');
    // __('key'), trans_choice('key'), @lang('key') in PHP and Blade.
    $scan(app_path(), ['*.php'], '/(?:__|trans_choice)\(\s*[\'"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)[\'"]/');
    $scan(resource_path('views'), ['*.blade.php'], '/(?:__|@lang|trans_choice)\(\s*[\'"]([a-z0-9_]+(?:\.[a-z0-9_]+)+)[\'"]/');

    $missing = $used->unique()
        ->reject(fn (string $key) => array_key_exists($key, $lines) || array_key_exists($key, $bases))
        ->sort()
        ->values()
        ->all();

    expect($used)->not->toBeEmpty()
        ->and($missing)->toBe([], "Add these keys to lang/en.json (and every other locale):\n".implode("\n", $missing));
});

test('package messages are translated', function () {
    expect(__('The provided two factor authentication code was invalid.', [], 'fr'))
        ->toBe(translations('fr')['The provided two factor authentication code was invalid.']);
});
