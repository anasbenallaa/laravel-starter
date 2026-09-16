## Project conventions (read first)

- Before any change, activate the `project-conventions` skill: read `docs/architecture.md` (structure, design-system building blocks, guard tests) and `CHANGELOG.md`, then load the domain skills.
- Reuse the design system (`DataTable`, `FormSection` + `UnsavedChangesBar`, `ConfirmDialog`, central `lib/` presentation helpers, HugeIcons); never duplicate components or hardcode per-page styles.
- Every change adds an entry under `[Unreleased]` in `CHANGELOG.md`; update `docs/architecture.md` when adding areas, shared components, helpers, guard tests, commands or skills.

## UI pages and tables

- Before creating or restyling any page, table, list, form, dialog or navigation entry in `resources/js`, activate the `ui-page-and-table` skill and follow `docs/ui-guidelines.md`.
- Paginated lists always use `@/components/data-table/data-table` with server-side search, filters, `App\Support\SortOrder` and `paginate()->withQueryString()`.
- Forms use `FormSection` and save through `UnsavedChangesBar` (no Save/Cancel buttons), deletes use `ConfirmDialog`, icons are HugeIcons via `@/components/ui/icon`, and pages have breadcrumbs instead of back buttons.

## Feature permissions

- Every new feature, page, route or controller must declare and enforce its permissions: activate the `feature-permissions` skill first and follow `docs/authorization.md` ("Every new feature needs permissions").
- Register permissions only in `config/permissions.php` (`resource.action`), protect every route with `can:` middleware, authorize in Form Requests, check permissions (never role names), hide unavailable UI with `useAuthorization().can()`, and add 403 tests.
- `tests/Feature/Authorization/RoutePermissionsTest.php` must stay green; don't allowlist routes to silence it.

## Activity log (required for every action)

- Every page, form, endpoint, job or command that creates, changes or deletes data, or performs an action (export, import, connect, sync, approve, assign…), must be recorded in the activity log. Follow `docs/activity-log.md` ("Every action needs an activity") and the activity step in the `ui-page-and-table` and `feature-permissions` skills.
- Models users change `use Auditable` (with `activityLabel()`); pivot, bulk and custom actions are logged with `ActivityLoggerInterface`; never log standard model CRUD twice, and never log secrets.
- Assert the activity in the feature's tests. `tests/Feature/Activity/AuditableModelsTest.php` must stay green; don't allowlist models to silence it. Activities are read-only: never add routes or code that edit or delete them.

## Localization (required for every string)

- The app is translated into English, French and Arabic (right-to-left). Before adding or changing any user-visible text, activate the `localization` skill and follow `docs/localization.md`.
- Never hardcode text: use `t('area.key')` in React and `__('area.key')` in PHP, and add the key to every `lang/*.json` file (the only translation source). Frontend placeholders are `{{name}}`, backend ones `:name`; plurals need each language's forms (`users.count_one`, …).
- Use logical Tailwind classes (`ms-`, `pe-`, `start-`, `text-start`, `border-s`), flip directional icons with `rtl:rotate-180`, wrap emails/IPs/identifiers in `<Ltr>`, format dates and numbers with `useFormatters()`, and base direction logic on `direction === 'rtl'`, never on a locale code. Don't translate user data or identifiers.
- `tests/Feature/Localization/TranslationFilesTest.php` and `LocaleTest.php` must stay green.
