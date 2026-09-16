---
name: project-conventions
description: 'Orientation for ANY change in this repository. Load this FIRST before adding, changing, fixing or refactoring code, pages, components, routes, models, commands, docs or tests, so the work fits the existing structure and design system and the CHANGELOG is updated. Triggers on: implement, add, create, build, change, update, refactor, fix, remove, new feature, new page, new module, style, design.'
license: MIT
metadata:
    author: project
---

# Project conventions

This app has an established structure, design system and set of guard rails.
Work with them, never around them. Every change ends with a CHANGELOG entry.

## Step 1: orient (always)

1. Read `docs/architecture.md`: where things live, the reusable building blocks, the central helpers, guard tests and commands.
2. Skim `CHANGELOG.md` (`[Unreleased]`) to see recent decisions. Don't reintroduce something that was deliberately removed or changed (e.g. the separate permissions page, Save/Cancel buttons, role cards, Lucide icons).
3. Load the domain skill(s) for the work:
    - UI (page, table, form, dialog, navigation, icons): `ui-page-and-table`, then follow `docs/ui-guidelines.md`.
    - Any feature, route, controller or action: `feature-permissions`, which covers permissions plus activity logging (`docs/authorization.md`, `docs/activity-log.md`).
    - Any user-visible text, layout or formatting: `localization` (`docs/localization.md`), translated into English, French and Arabic, right-to-left safe.
    - Notifications: `docs/notifications.md`.
    - Framework details: the Boost skills (Inertia React, Wayfinder, Tailwind, Laravel best practices, testing).
4. Open the closest existing example and copy its structure (see "Reference implementations" below).

## Step 2: respect the design system

Reuse; never re-implement or restyle per page.

| Need                    | Use                                                                                                                                           |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Lists / tables          | `DataTable` (server or local rows, search, filter menu, sort, tabs, group rows)                                                               |
| Forms                   | `FormSection` + `UnsavedChangesBar` (no Save/Cancel), `InputError`                                                                            |
| Delete confirmation     | `ConfirmDialog` + a flash toast                                                                                                               |
| Feeds / timelines       | `<InfiniteScroll>` + sticky right filter panel (`pages/activities/index.tsx`)                                                                 |
| Filters in the URL      | `useQueryFilters`                                                                                                                             |
| Permissions in UI       | `useAuthorization().can()`                                                                                                                    |
| Icons                   | HugeIcons via `Icon`, following the icon table in `docs/ui-guidelines.md`                                                                     |
| Colors / labels / dates | The central helpers in `lib/` (`activity-presentation`, `notifications`, `permissions`, `dates`). Add new mappings there, never inline.       |
| Text                    | `t('area.key')` / `__('area.key')` with the key in every `lang/*.json`; `useFormatters()` for dates and numbers; `<Ltr>` for technical values |
| Layout direction        | Logical Tailwind classes (`ms-`, `pe-`, `start-`, `text-start`), `rtl:rotate-180` on directional icons, `useLocale().isRtl`                   |

Page anatomy: `<Head title>`, breadcrumbs through `Page.layout`, `p-4 md:p-6`,
no back buttons, theme tokens that work in dark mode, and checked at 390px.

If something new is genuinely reusable, build it as a shared component, use it,
and document it in `docs/ui-guidelines.md` and `docs/architecture.md`.

## Step 3: respect the guard rails

- **Permissions:** register them in `config/permissions.php`, protect routes with `can:`, authorize in Form Requests, and add 403 tests. `RoutePermissionsTest` must pass.
- **Activity log:** models use `Auditable`; pivot, bulk and custom actions go through `ActivityLoggerInterface`; assert activities in tests. `AuditableModelsTest` must pass.
- **Architecture:** thin controllers, Form Requests, Actions and Services behind Contracts, Wayfinder URLs, no new base folders or dependencies without approval.
- **Localization:** no hardcoded text; every key in `lang/en.json`, `lang/fr.json` and `lang/ar.json`; RTL-safe layout. `TranslationFilesTest` and `LocaleTest` must pass.
- **Security:** no secrets in logs, notifications or metadata; scope queries to the user; follow the delegation rules.

## Step 4: verify

```bash
php artisan wayfinder:generate --with-form
npx vp check --fix && npx tsc --noEmit && npm run build
vendor/bin/pint --parallel && vendor/bin/phpstan analyse --memory-limit=512M
php artisan test --compact
```

For UI changes, check light mode, dark mode and 390px width in the browser, in English, French and Arabic (right-to-left).

## Step 5: record the change (required)

1. **`CHANGELOG.md`:** add a line under `[Unreleased]` in the right group (Added, Changed, Fixed, Removed, Security). Start with the bold area name, then say what changed and name the key file or doc, e.g.:

    ```markdown
    - **Orders:** create/edit/delete orders with `orders.*` permissions, `Auditable` model and CSV export (`docs/orders.md`).
    ```

2. **`docs/architecture.md`:** update it when you add a new area, folder, shared component, central helper, guard test, command or skill.
3. **Domain docs:** update `docs/ui-guidelines.md`, `docs/authorization.md`, `docs/activity-log.md`, `docs/notifications.md` or `docs/localization.md` when you change a documented pattern.
4. **Skills:** edit them in `.ai/skills/`, then copy to `.claude/skills/` and `.cursor/skills/`.

## Reference implementations

| Building                                             | Copy from                                                                                       |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| Paginated table page with filters and sort           | `pages/admin/users/index.tsx` + `Admin/UserController@index`                                    |
| Table with view tabs, local rows and groups          | `pages/admin/roles/index.tsx`                                                                   |
| Create/edit form with unsaved bar                    | `components/users/user-form.tsx`, `components/authorization/role-form.tsx`                      |
| Form that stays open after save                      | `pages/admin/users/access.tsx`                                                                  |
| Infinite timeline with sticky filters and CSV export | `pages/activities/index.tsx` + `ActivityController`, `App\Activity\ActivityFeed`, `ActivityCsv` |
| Generic service behind a contract                    | `NotificationService`, `ActivityLogger`                                                         |
| Global search provider                               | `App\Search\Providers\UserSearchProvider`                                                       |

## Common mistakes

- Starting to code without reading `docs/architecture.md`, or duplicating an existing component or helper.
- Hardcoding colors, labels or icons in a page instead of the central `lib/` helper.
- Finishing without a `CHANGELOG.md` entry, or leaving `docs/architecture.md` out of date.
- Undoing a recorded decision from the changelog without being asked.
- Hardcoded English strings, keys added to `en.json` only, or physical `ml-`/`left-`/`text-left` classes that break Arabic.
