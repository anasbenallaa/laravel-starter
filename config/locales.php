<?php

/*
|--------------------------------------------------------------------------
| Supported locales
|--------------------------------------------------------------------------
|
| The single list of languages the application supports. Translations live in
| lang/{code}.json (the only translation source, shared by Laravel and React).
|
| To add a language: add an entry here, create lang/{code}.json with every key
| from lang/en.json, and run the tests (TranslationFilesTest checks keys,
| placeholders and plural forms).
|
| plural_forms are the Intl.PluralRules categories the language uses; plural
| keys in the JSON files need one entry per form, e.g. "users.count_one".
|
*/

return [

    'default' => 'en',

    'supported' => [

        'en' => [
            'name' => 'English',
            'native_name' => 'English',
            'direction' => 'ltr',
            'plural_forms' => ['one', 'other'],
        ],

        'fr' => [
            'name' => 'French',
            'native_name' => 'Français',
            'direction' => 'ltr',
            'plural_forms' => ['one', 'many', 'other'],
        ],

        'ar' => [
            'name' => 'Arabic',
            'native_name' => 'العربية',
            'direction' => 'rtl',
            'plural_forms' => ['zero', 'one', 'two', 'few', 'many', 'other'],
        ],

    ],

];
