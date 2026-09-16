## UI pages and tables

- Before creating or restyling any page, table, list, form, dialog or navigation entry in `resources/js`, activate the `ui-page-and-table` skill and follow `docs/ui-guidelines.md`.
- Paginated lists always use `@/components/data-table/data-table` with server-side search, filters, `App\Support\SortOrder` and `paginate()->withQueryString()`.
- Forms use `FormSection` and save through `UnsavedChangesBar` (no Save/Cancel buttons), deletes use `ConfirmDialog`, icons are HugeIcons via `@/components/ui/icon`, and pages have breadcrumbs instead of back buttons.

## Feature permissions

- Every new feature, page, route or controller must declare and enforce its permissions: activate the `feature-permissions` skill first and follow `docs/authorization.md` ("Every new feature needs permissions").
- Register permissions only in `config/permissions.php` (`resource.action`), protect every route with `can:` middleware, authorize in Form Requests, check permissions (never role names), hide unavailable UI with `useAuthorization().can()`, and add 403 tests.
- `tests/Feature/Authorization/RoutePermissionsTest.php` must stay green; don't allowlist routes to silence it.
