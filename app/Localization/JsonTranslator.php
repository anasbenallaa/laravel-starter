<?php

namespace App\Localization;

use Illuminate\Support\Arr;
use Illuminate\Translation\Translator;

/**
 * Translations live only in lang/{locale}.json with flat dotted keys
 * ("validation.attributes.email"). Laravel resolves single lines from JSON,
 * but a few framework lookups ask for a whole group as an array (e.g. the
 * validator's `validation.attributes` and `validation.custom`). This
 * translator answers those from the JSON keys under that prefix, so no PHP
 * translation files are needed. It also falls back to the fallback locale's
 * JSON line when a key is missing (Laravel only falls back for PHP files).
 */
class JsonTranslator extends Translator
{
    /**
     * @param  string  $key
     * @param  array<string, mixed>  $replace
     * @param  string|null  $locale
     * @param  bool  $fallback
     * @return string|array<array-key, mixed>
     */
    public function get($key, array $replace = [], $locale = null, $fallback = true)
    {
        $line = parent::get($key, $replace, $locale, $fallback);

        // Laravel doesn't fall back to the fallback locale's JSON file.
        $fallbackLocale = $this->getFallback();

        if ($line === $key && $fallback && ($locale ?: $this->locale) !== $fallbackLocale) {
            $line = parent::get($key, $replace, $fallbackLocale, false);
        }

        if ($line !== $key || str_contains($key, ' ')) {
            return $line;
        }

        $locales = $fallback ? $this->localeArray($locale) : [$locale ?: $this->locale];

        foreach ($locales as $candidate) {
            $group = $this->jsonGroup($key, $candidate);

            if ($group !== []) {
                return $group;
            }
        }

        return $line;
    }

    /**
     * The JSON lines under "{prefix}." for a locale, as a nested array.
     *
     * @return array<array-key, mixed>
     */
    private function jsonGroup(string $prefix, string $locale): array
    {
        $this->load('*', '*', $locale);

        $lines = [];

        foreach ($this->loaded['*']['*'][$locale] ?? [] as $jsonKey => $value) {
            if (str_starts_with((string) $jsonKey, $prefix.'.')) {
                $lines[substr((string) $jsonKey, strlen($prefix) + 1)] = $value;
            }
        }

        return Arr::undot($lines);
    }
}
