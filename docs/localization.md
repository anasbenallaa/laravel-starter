# Localization (i18n) and right-to-left

The whole application is translated into **English (`en`, default and
fallback), French (`fr`) and Arabic (`ar`, right-to-left)**. Every piece of
interface text is translated: pages, tables, forms, dialogs, toasts, validation
and flash messages, emails, notifications, activity sentences, aria-labels,
placeholders and page titles.

**Rule: no hardcoded user-visible text.** Every string goes through a
translation key that exists in every `lang/*.json` file.
`tests/Feature/Localization/TranslationFilesTest.php` fails otherwise.

## How it fits together

```
config/locales.php          supported locales: name, native name, direction, plural forms
lang/{en,fr,ar}.json        the ONLY translation source, shared by Laravel and React
        │
        ├── Laravel: __('key'), trans_choice('key', n), @lang('key')
        │     App\Localization\JsonTranslator   JSON groups + JSON fallback to en
        │
        └── React: i18next + react-i18next, t('key'), loaded per language by Vite
              resources/js/lib/i18n.ts          setup, lazy language chunks
```

Request flow:

1. `SetLocale` middleware (web group, before Inertia) picks the locale: **the
   signed-in user's `users.locale` → the session `locale` → `en`**. Unsupported
   values are ignored. It sets `App::setLocale()` and Carbon's locale.
2. `HandleInertiaRequests` shares `localization`:
   `{ locale, direction, fallbackLocale, supportedLocales }`.
3. `app.blade.php` renders `<html lang dir>` on the server (no flash of LTR).
4. `app.tsx` loads the active language file, then renders. `LocaleRoot` (the
   outermost layout on every page) keeps `lang`/`dir` in sync, wraps the app in
   Radix `DirectionProvider` and renders the `Toaster` in the reading direction.

Switching language (`POST /locale`, named `locale.update`, throttled):

- Validates `locale` against `config/locales.php`; anything else gets a 422.
- Guests: saved in the session (and flagged as an explicit choice, so it is
  saved to the account when they sign in, see `ApplyChosenLocale`).
- Signed-in users: saved to **their own** `users.locale` only.
- Redirects back to the previous page, but only if it belongs to this app
  (the Referer header is never trusted blindly).
- Logging out carries the language over to the login page (`LogoutResponse`)
  without overriding the next user's saved preference.

Entry points: `LanguageSwitcher` in the app header and on auth pages, and the
**Language** card in Settings → Profile (`LanguagePreference`). Both call
`useLocale().setLocale()`, which downloads the language first, so the page
re-renders translated and flipped without a reload.

## Translation keys

Flat, dotted, semantic, lowercase: `area.sub_area.name`.

| Prefix                                        | For                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------- |
| `common.*`                                    | Generic words: save, cancel, delete, search, none, yes/no           |
| `navigation.*`                                | Sidebar, header, user menu, breadcrumbs of top-level pages          |
| `fields.*`, `placeholders.*`                  | Shared form labels and placeholders                                 |
| `table.*`, `unsaved.*`, `search.*`            | `DataTable`, `UnsavedChangesBar`, global search                     |
| `auth.*`, `settings.*`                        | Auth pages and settings (also Laravel's `auth.failed` etc.)         |
| `users.*`, `roles.*`, `permissions.*`         | Admin areas; `permissions.label.{name}`, `permissions.resource.{r}` |
| `activities.*`                                | Timeline UI, `activities.action.*`, `activities.sentence.*`, CSV    |
| `notifications.*`                             | Bell, page, levels; `notifications.demo.*` samples                  |
| `flash.*`, `errors.*`                         | Server toasts and domain validation errors                          |
| `validation.*`, `passwords.*`, `pagination.*` | Laravel's framework messages (`validation.attributes.*` for names)  |
| `mail.*`                                      | Password reset / verification emails and the mail layout            |

Package messages: Fortify and Passkeys translate a few English sentences
directly (e.g. "The provided two factor authentication code was invalid.").
Those exact sentences are the only non-dotted keys, listed in
`PACKAGE_LITERAL_KEYS` in `TranslationFilesTest`.

Placeholders:

- **Frontend** keys (rendered with `t()`) use i18next syntax: `{{name}}`,
  `{{count, number}}` (formatted with `Intl.NumberFormat`).
- **Backend** keys (rendered with `__()`) use Laravel syntax: `:name`.
- A key is used by one side only; the test checks every locale keeps the same
  placeholder names as English.

### Plurals

Frontend plurals use i18next suffixes, one per plural form the language needs
(`plural_forms` in `config/locales.php`, the `Intl.PluralRules` categories):

```json
"users.count_one": "{{count, number}} user",
"users.count_other": "{{count, number}} users"
```

| Locale | Forms                            |
| ------ | -------------------------------- |
| en     | one, other                       |
| fr     | one, many, other                 |
| ar     | zero, one, two, few, many, other |

```tsx
t('users.count', { count: 42 }); // "42 users" / "42 utilisateurs" / "42 مستخدمًا"
```

Backend plurals use Laravel's `trans_choice()` with ranges in one line, e.g.
`"{0} …|{1} :count user|[2,*] :count users"` (Arabic adds `{2}`, `[3,10]`,
`[11,*]`).

### Using translations

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation();
<Head title={t('navigation.users')} />
<Button>{t('common.save')}</Button>
<Input placeholder={t('users.index.search')} aria-label={t('common.search')} />
```

Static objects that can't call hooks store **keys** and are translated where
rendered:

- `Page.layout = { title: 'auth.login.title', description: '…' }` on auth pages
  (translated by `AuthLayout`).
- Breadcrumbs: `{ title: 'navigation.users', href }`; for user data (a user or
  role name) pass `{ title: user.name, href, literal: true }`.

Backend:

```php
Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.user_created')]);
$validator->errors()->add('roles', __('errors.access.roles_not_owned', ['roles' => $names]));
```

Mail and notifications to a user are sent in **their** language
(`User implements HasLocalePreference`).

## What is never translated

- **User data:** names, emails, role names, stored notification/activity text,
  search terms.
- **Identifiers:** permission names (`users.view`), activity action values
  (`created`), enum values (`success`), event names, routes and CSV values.
  Show a translated **label** next to them instead (`permissionLabel(name, t)`,
  `actionPresentation(action, t).label`).

## Dates and numbers

Never call `toLocaleString()` or format by hand. Use `useFormatters()`:

```tsx
const { relativeTime, dateTime, date, number } = useFormatters();
relativeTime(iso); // "3 minutes ago" / "il y a 3 minutes" / "قبل 3 دقائق"
```

They use `Intl` with the active language (`lib/dates.ts`). Server-side
relative times (e.g. passkeys' "Added 2 days ago") use Carbon, whose locale is
set by `SetLocale`.

## Notifications and activities render in the reader's language

- **Notifications** store translation keys and parameters next to the fallback
  text: pass `titleKey`, `messageKey`, `actionLabelKey` and `parameters` to
  `NotificationData` (title/message are filled in English when omitted). The
  UI renders `notificationText(notification, t)`; old rows without keys show
  their stored text. See `docs/notifications.md`.
- **Activities** keep their English `description` as stored data; the timeline
  builds the sentence at render time from `action`, subject type, label and
  metadata (`activitySentence(activity, t)` with `activities.sentence.*`).
  Custom actions without a sentence fall back to the stored description. Add a
  sentence key when you add a common action.

## Right-to-left (RTL)

Direction comes from `config/locales.php`. **Never test the locale code**
(`locale === 'ar'`); use `useLocale().isRtl` (`direction === 'rtl'`) or CSS.

What is already mirrored:

- `<html dir>`, Radix `DirectionProvider` (menus, selects, tooltips, sub-menus).
- The sidebar sits on the right on desktop and the mobile sheet slides in from
  the right (`side={isRtl ? 'right' : 'left'}`); the sidebar toggle icon flips.
- Toasts appear bottom-left in RTL.
- Breadcrumb separators, pagination arrows, "go" chevrons, the change arrow in
  activity details and the timeline line.
- shadcn primitives (dialog/sheet close buttons, dropdown and select items,
  table headers, toggle groups) use logical properties.

Rules for new UI:

| Instead of                          | Use                            |
| ----------------------------------- | ------------------------------ |
| `ml-*`, `mr-*`, `pl-*`, `pr-*`      | `ms-*`, `me-*`, `ps-*`, `pe-*` |
| `left-*`, `right-*`                 | `start-*`, `end-*`             |
| `text-left`, `text-right`           | `text-start`, `text-end`       |
| `border-l`, `border-r`              | `border-s`, `border-e`         |
| `rounded-l-*`, `rounded-r-*`        | `rounded-s-*`, `rounded-e-*`   |
| `space-x-*` between inline items    | `gap-*`                        |
| `DataTable` column `align: 'right'` | `align: 'end'`                 |

- Directional icons (arrows, chevrons pointing "forward"/"back") get
  `className="rtl:rotate-180"`. Symmetric icons (search, bell, check) don't.
- Technical values stay left-to-right inside RTL text: wrap emails, IPs, URLs,
  identifiers and codes in `<Ltr>` (`components/ltr.tsx`, a `<bdi dir="ltr">`);
  email inputs get `dir="ltr"`. OTP inputs are always LTR.
- Centering (`left-1/2 -translate-x-1/2`) is symmetric and fine.

## Adding a language

1. Add it to `config/locales.php` (name, native name, `direction`,
   `plural_forms` from `new Intl.PluralRules(code).resolvedOptions().pluralCategories`).
2. Copy `lang/en.json` to `lang/{code}.json` and translate every value; add the
   extra plural forms the language needs; keep placeholders.
3. Add the code to the `Locale` type in `resources/js/types/localization.ts`.
4. Add `language.name.{code}` to every file.
5. Run `php artisan test --filter=Translation` until green, then check the
   pages in the browser (use a right-to-left language's direction if needed).

No component changes are needed: direction, switcher, settings and formatting
all read the configuration.

## Adding text to a feature (checklist)

- [ ] Every visible string, placeholder, aria-label, title, toast and error is a key.
- [ ] The key exists in `en.json`, `fr.json` and `ar.json` (plural forms per language).
- [ ] Frontend keys use `{{param}}`, backend keys use `:param`.
- [ ] Dates and numbers go through `useFormatters()`.
- [ ] New permissions have `permissions.label.*` (and `permissions.resource.*`).
- [ ] New activity actions have `activities.action.*` (and a sentence when useful).
- [ ] Notifications use `titleKey`/`messageKey`.
- [ ] Layout uses logical classes; directional icons flip; technical values use `<Ltr>`.
- [ ] Checked in English, French and Arabic (RTL), light and dark, at 390px.
- [ ] `TranslationFilesTest` and `LocaleTest` pass.

## Tests

| Test                                                  | Covers                                                                                                                                                           |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `tests/Feature/Localization/LocaleTest.php`           | Default en, switching (guest/user), RTL props and `<html dir>`, invalid codes, persistence, own-account only, safe redirect, fallback, logout/login/registration |
| `tests/Feature/Localization/TranslationFilesTest.php` | Valid JSON, no duplicate keys, dotted keys, same keys in every locale, plural forms, placeholder parity, permission labels, every key used in code exists        |

## Files

| Path                                                                                    | Role                                                        |
| --------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `config/locales.php`, `app/Localization/Locales.php`                                    | Supported locales and helpers (`direction()`, `resolve()`)  |
| `app/Localization/JsonTranslator.php`                                                   | JSON-only translations (groups for the validator, fallback) |
| `app/Http/Middleware/SetLocale.php`                                                     | Locale per request                                          |
| `app/Http/Controllers/LocaleController.php`                                             | `POST /locale`                                              |
| `app/Listeners/ApplyChosenLocale.php`, `app/Http/Responses/LogoutResponse.php`          | Guest choice saved on sign-in; language kept after logout   |
| `resources/views/vendor/mail/*`, `resources/views/vendor/notifications/email.blade.php` | Translated, direction-aware email layout                    |
| `resources/js/lib/i18n.ts`                                                              | i18next setup and lazy language loading                     |
| `resources/js/hooks/use-locale.ts`, `use-formatters.ts`                                 | Locale props, `isRtl`, `setLocale`; Intl formatters         |
| `resources/js/components/locale-root.tsx`                                               | `lang`/`dir`, `DirectionProvider`, `Toaster`                |
| `resources/js/components/language-switcher.tsx`, `language-preference.tsx`, `ltr.tsx`   | Switcher, settings card, LTR isolation                      |
