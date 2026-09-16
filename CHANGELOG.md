# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project uses
[Semantic Versioning](https://semver.org/).

**Every change adds an entry under `[Unreleased]`**: one line per
user-visible or structural change, grouped as Added, Changed, Fixed, Removed or
Security. Name the area and the key file or doc, so humans and AI agents can
see how the codebase evolved. See `docs/architecture.md` for the current map.

## [Unreleased]

### Added

- **Activity log export:** `GET /activities/export` streams the timeline's current filtered, scoped rows as CSV (`ActivityCsv`, formula-safe) and records an `exported` activity; the page gains an **Export CSV** button.
- **Activity log** (`docs/activity-log.md`): single append-only `activities` table, `Auditable` trait + generic `ActivityObserver`, `ActivityLoggerInterface`, login/logout listener, role/permission/password change logging, read-only `/activities` timeline with infinite scroll (cursor pagination, 20 per page), filters and `activities.view.all`; "View activities" in the Users menu.
- **Guard test** `AuditableModelsTest`: every model must use `Auditable`.
- **Global search records:** server search for users, roles and permissions (max 5 per group) via `App\Search\SearchProvider` providers and `GET /search`.
- **`notifications:demo` command** to preview every notification style.
- **Feature permissions rule** (`docs/authorization.md`) and guard test `RoutePermissionsTest` (every route protected, every permission registered).
- **Unsaved changes bar** (`UnsavedChangesBar`) replacing Save/Cancel buttons on forms: bottom-center pill on desktop, replaces the header on mobile, Enter to save.
- **`DataTable`** reusable table: header with title, search, filter menu (`FilterIcon`), actions; sortable columns backed by `App\Support\SortOrder`; pagination footer; view tabs, local rows and group rows.
- **User management:** create, edit and delete users with anti-takeover delegation rules; `DeleteUser` action also removes notifications and avatar.
- **Roles & permissions (RBAC)** with spatie/laravel-permission v8: protected Admin super-admin, permissions defined in `config/permissions.php` + `permissions:sync`, roles CRUD, user access editor (roles, direct and effective permissions), privilege-escalation protection, last-admin protection.
- **Notifications:** generic database notifications (`ApplicationNotification`, `NotificationService`), header bell with unread badge, notifications page.
- **UI guidelines** (`docs/ui-guidelines.md`), architecture map (`docs/architecture.md`), and AI skills `project-conventions`, `ui-page-and-table`, `feature-permissions`.

### Changed

- **Activities page:** full width, no heading; timeline scrolls on the left, search/filters/export in a sticky panel on the right (on top on mobile).
- **Roles & permissions page:** Roles, Matrix and Permissions views are one `DataTable` with tab buttons (previously role cards and separate tables).
- **Permissions** can only be created from code; the permissions page is read-only and merged into Roles & permissions; permission names allow an optional qualifier (`activities.view.all`).
- **Sidebar** groups renamed/organized as **Workspace** and **Administration**; items filtered by permission.
- **Font** changed to Bricolage Grotesque.
- **Home route** `/` redirects to the login page; welcome page removed.
- **Mobile:** sidebar closes after navigation or opening search; sidebar overlay is blurred; footer user menu hidden on mobile; notification panel centered.

### Fixed

- **Octane:** Caddyfile path for the FrankenPHP server in `docker/supervisord.conf`.

### Removed

- Separate `/admin/permissions` page and permission create/rename/delete endpoints.

### Security

- Activity logs never store passwords, tokens, secrets, hidden attributes, cookies or session data, and can't be edited or deleted.
- Notification and access-management endpoints are scoped to the authenticated user; non-admins can't grant access they don't hold or assign Admin.

## [0.1.0] - 2026-09-10

### Added

- Laravel React starter kit base: Fortify authentication (passkeys, two-factor), profile avatar uploads (S3/MinIO), settings pages using `SettingsCard`.
- Global search command palette (⌘K) in the sidebar.
- HugeIcons as the single icon set through the `Icon` component.
- Docker production image (FrankenPHP/Octane, Horizon, scheduler via supervisord), local compose setup, HTTPS enforcement in production.

[Unreleased]: https://github.com/anasbenallaa/laravel-starter/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/anasbenallaa/laravel-starter/releases/tag/v0.1.0
