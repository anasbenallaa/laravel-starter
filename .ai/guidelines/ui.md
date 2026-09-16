## UI pages and tables

- Before creating or restyling any page, table, list, form, dialog or navigation entry in `resources/js`, activate the `ui-page-and-table` skill and follow `docs/ui-guidelines.md`.
- Paginated lists always use `@/components/data-table/data-table` with server-side search, filters, `App\Support\SortOrder` and `paginate()->withQueryString()`.
- Forms use `FormSection` and save through `UnsavedChangesBar` (no Save/Cancel buttons), deletes use `ConfirmDialog`, icons are HugeIcons via `@/components/ui/icon`, and pages have breadcrumbs instead of back buttons.
