# Architecture map

A map of where things live and which building blocks to reuse. Read this
before changing the app, and keep it current when you add a new area. What
changed and when is recorded in [`CHANGELOG.md`](../CHANGELOG.md).

## Stack

| Layer           | Technology                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------------- |
| Backend         | Laravel 13 (PHP 8.4), Fortify auth (passkeys, 2FA), Octane (FrankenPHP), Horizon (Redis queues) |
| Database        | PostgreSQL (SQLite in tests), integer ids                                                       |
| Frontend        | Inertia v3, React 19, TypeScript, Tailwind CSS v4, shadcn/ui                                    |
| Routing to JS   | Wayfinder: `@/actions/...` and `@/routes/...` (never hardcode URLs)                             |
| Icons           | HugeIcons only, through `@/components/ui/icon`                                                  |
| Authorization   | spatie/laravel-permission v8 + Gate (`Admin` passes every check)                                |
| Tests / quality | Pest, Larastan level 7, Pint, `vp check` (lint + format), `tsc`                                 |
| Font            | Bricolage Grotesque (Bunny fonts, `vite.config.ts`)                                             |

## Domain docs (read the one for the area you touch)

| Doc                                         | Covers                                                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| [`docs/ui-guidelines.md`](ui-guidelines.md) | **Design system:** page anatomy, `DataTable`, forms + `UnsavedChangesBar`, dialogs, icons, colors, activity logging, checklist |
| [`docs/authorization.md`](authorization.md) | Roles, permissions, delegation rules, "every new feature needs permissions"                                                    |
| [`docs/activity-log.md`](activity-log.md)   | Audit trail: `Auditable`, `ActivityLogger`, timeline, CSV export, "every action needs an activity"                             |
| [`docs/notifications.md`](notifications.md) | In-app notifications, `notifications:demo`                                                                                     |

## Backend (`app/`)

| Path                                    | What lives there                                                                                                                                             |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Actions/`                              | Single-purpose operations: `Authorization/SyncPermissions`, `Authorization/LogAccessChanges`, `Users/DeleteUser`, `Fortify/*`                                |
| `Activity/`                             | Audit internals: `ActivityAction` (common verbs), `AuditableAttributes` (safe values), `ActivityFeed` (scoped + filtered query), `ActivityCsv`               |
| `Authorization/`                        | `SystemRole` (Admin), `PermissionRegistry` (naming, grouping), `PermissionDelegation` (anti-escalation)                                                      |
| `Concerns/`                             | Shared validation rules (`PasswordValidationRules`, `ProfileValidationRules`, `AccessValidationRules`)                                                       |
| `Console/Commands/`                     | `permissions:sync`, `notifications:demo`                                                                                                                     |
| `Contracts/`                            | `NotificationServiceInterface`, `ActivityLoggerInterface` (bound in `AppServiceProvider`)                                                                    |
| `Enums/`                                | `NotificationLevel`                                                                                                                                          |
| `Http/Controllers/`                     | Thin controllers; `Admin/` (users, access, roles), `Settings/` (profile, security), `NotificationController`, `ActivityController`, `GlobalSearchController` |
| `Http/Requests/`                        | Form Requests: authorization + validation (+ delegation rules in `after()`)                                                                                  |
| `Http/Resources/`                       | `NotificationResource`                                                                                                                                       |
| `Http/Middleware/HandleInertiaRequests` | Shared props: `auth` (user, roles, permissions, isAdmin), `notificationSummary`, `sidebarOpen`                                                               |
| `Listeners/`                            | `LogAuthenticationActivity` (auto-discovered)                                                                                                                |
| `Models/`                               | `User` (`Auditable`, `HasRoles`), `Activity` (append-only); `Concerns/Auditable`                                                                             |
| `Notifications/`                        | `ApplicationNotification` + `Data/NotificationData`                                                                                                          |
| `Observers/`                            | `ActivityObserver` (generic, used by `Auditable`)                                                                                                            |
| `Search/`                               | Global search: `GlobalSearch` + `Providers/*` (users, roles, permissions)                                                                                    |
| `Services/`                             | `NotificationService`, `ActivityLogger`                                                                                                                      |
| `Support/`                              | `SortOrder` (whitelisted server-side sorting)                                                                                                                |

Config: `config/permissions.php` is the **only** place permissions are defined.
Routes: `routes/web.php` (dashboard, activities, search), `settings.php`,
`notifications.php`, `admin.php`. Every route is guarded by `can:` or is on an
explicit allowlist.

## Frontend (`resources/js/`)

### Design-system building blocks (reuse, never re-implement)

| Need                           | Use                                                                                                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Any list of records            | `components/data-table/data-table.tsx` (`DataTable`): server or local rows, search, filter menu, sortable columns, view tabs, group rows, pagination/count footer |
| Create / edit form             | `components/form-section.tsx` + `components/unsaved-changes-bar.tsx` (no Save/Cancel buttons)                                                                     |
| Destructive confirm            | `components/confirm-dialog.tsx`                                                                                                                                   |
| Pagination for non-table lists | `components/simple-pagination.tsx`                                                                                                                                |
| Timeline / infinite feed       | `components/activities/activity-item.tsx` + Inertia `<InfiniteScroll>` + sticky right filter panel (`pages/activities/index.tsx`)                                 |
| Query-string filters           | `hooks/use-query-filters.ts` (debounce, `immediate`, `reset`/`only` for merged props)                                                                             |
| Permission checks in UI        | `hooks/use-authorization.ts` (`can`, `canAny`, `canAll`, `hasRole`, `isAdmin`)                                                                                    |
| Icons                          | `components/ui/icon.tsx` + `@hugeicons/core-free-icons`                                                                                                           |
| Primitives                     | `components/ui/*` (shadcn: button, badge, table, select, dialog, dropdown-menu, sheet, tooltip, checkbox, skeleton…)                                              |

### Central presentation helpers (one place per concern)

| File                           | Owns                                                           |
| ------------------------------ | -------------------------------------------------------------- |
| `lib/activity-presentation.ts` | Activity action verb, icon, color tone; field/value formatting |
| `lib/notifications.ts`         | Notification level colors/icons, notification actions          |
| `lib/permissions.ts`           | Permission/resource labels, delegation helper, `ADMIN_ROLE`    |
| `lib/dates.ts`                 | `formatRelativeTime`, `formatDateTime`                         |
| `lib/utils.ts`                 | `cn`, `toUrl`                                                  |

### App shell and navigation

- `layouts/app/app-sidebar-layout.tsx` → `components/app-sidebar.tsx` (groups **Workspace** / **Administration**, items filtered by `permission`) and `components/app-sidebar-header.tsx` (breadcrumbs, `NotificationBell`, mobile user menu).
- Global search (⌘K): `components/global-search.tsx` + `hooks/use-search-items.tsx` (pages/actions) + `hooks/use-remote-search.ts` (server results, max 5 per group).
- Pages: `pages/**` (`dashboard`, `notifications`, `activities/index`, `admin/users/*`, `admin/roles/*`, `settings/*`, `auth/*`); breadcrumbs via `Page.layout`.
- Types: `types/*` (`auth`, `authorization`, `activity`, `notifications`, `pagination`, `navigation`, `ui`).

## Guard tests (must stay green; never allowlist to silence them)

| Test                                                   | Enforces                                                                                                                        |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `tests/Feature/Authorization/RoutePermissionsTest.php` | Every authenticated route has `can:` (or a justified allowlist entry); every used permission exists in `config/permissions.php` |
| `tests/Feature/Activity/AuditableModelsTest.php`       | Every model in `app/Models` uses `Auditable` (except `Activity`)                                                                |

## AI skills (`.ai/skills`, copied to `.claude/skills` and `.cursor/skills`)

| Skill                                                                                                                                                 | Load when                                                             |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `project-conventions`                                                                                                                                 | **First, for any change**: orientation, design system, changelog      |
| `ui-page-and-table`                                                                                                                                   | Any page, table, form, dialog, navigation entry or icon               |
| `feature-permissions`                                                                                                                                 | Any feature, route, controller or action (permissions + activity log) |
| Boost skills (`inertia-react-development`, `wayfinder-development`, `tailwindcss-development`, `laravel-best-practices`, `testing-best-practices`, …) | Framework-specific details                                            |

Edit skills in `.ai/skills/` (source) and copy them to `.claude/skills/` and
`.cursor/skills/` (or run `php artisan boost:update`).

## Commands

```bash
php artisan permissions:sync             # create configured permissions, grant Admin
php artisan notifications:demo [user]    # sample notifications for design checks
php artisan wayfinder:generate --with-form
npx vp check --fix && npx tsc --noEmit && npm run build
vendor/bin/pint --parallel && vendor/bin/phpstan analyse --memory-limit=512M
php artisan test --compact
```
