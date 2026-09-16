# Roles & permissions

Role-based access control is built on
[spatie/laravel-permission](https://spatie.be/docs/laravel-permission) (v8)
and Laravel's Gate. The system only knows about **users**, **roles** and
**permission names**. Each module decides which permission its actions need.

> **Required:** every new feature, page, route or controller must declare and
> enforce its permissions. See
> [Every new feature needs permissions](#every-new-feature-needs-permissions).
> `tests/Feature/Authorization/RoutePermissionsTest.php` fails the build when a
> route isn't protected. AI agents load the `feature-permissions` skill first.

## Concepts

| Concept         | Where                                           | Notes                                                                                             |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Permission list | `config/permissions.php`                        | The one canonical list, as `resource => [actions]`. It produces `resource.action` names.          |
| Admin role      | `App\Authorization\SystemRole::ADMIN`           | Passes every Gate check. Can't be renamed, edited or deleted. There is always at least one Admin. |
| Custom roles    | Database                                        | Created at runtime under **Administration → Roles & permissions**. There is no role enum.         |
| Delegation      | `App\Authorization\PermissionDelegation`        | Non-admins can only grant permissions they hold. Only an Admin can grant or remove Admin.         |
| Naming rules    | `App\Authorization\PermissionRegistry::PATTERN` | `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`, e.g. `reports.export` or `purchase_orders.approve`.         |

## Every new feature needs permissions

A feature isn't finished until all of the following are done. Skipping a step
either leaves the feature open to every signed-in user, or hides it from
everyone, including roles that should have it.

| #   | Step                                                                                                                                                                                                                                                   | Where                                     |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------- |
| 1   | **Choose the permissions.** Use `resource.action`, lowercase snake_case: `view`, `create`, `update`, `delete`, plus specific actions like `approve`, `export` or `connect`. Don't reuse another feature's permission.                                  | Design                                    |
| 2   | **Register them.** Add `'resource' => [...actions]`. This is the only place permissions are defined.                                                                                                                                                   | `config/permissions.php`                  |
| 3   | **Sync.** Run `php artisan permissions:sync`; deploys run it automatically. Admin gets the new permissions, and other roles get them from **Roles & permissions**.                                                                                     | CLI                                       |
| 4   | **Protect every route** with `->middleware('can:resource.action')`. Only when middleware can't express the rule (e.g. "either of two permissions"), authorize in the controller and add the route to `CONTROLLER_AUTHORIZED_ROUTES` in the guard test. | `routes/*.php`                            |
| 5   | **Authorize again in Form Requests:** `authorize()` returns `$this->user()->can('resource.action')`.                                                                                                                                                   | `app/Http/Requests`                       |
| 6   | **Use a policy** when access depends on the record (ownership, status, team), starting from the permission: `$user->can('orders.update') && $order->isEditable()`.                                                                                     | `app/Policies`                            |
| 7   | **Delegation:** if the feature grants or manages access, use `PermissionDelegation` so non-admins can't escalate privileges.                                                                                                                           | `app/Authorization`                       |
| 8   | **Hide what the user can't use:** `useAuthorization().can('resource.action')` on buttons, menu items and row actions. This is UX only.                                                                                                                 | React                                     |
| 9   | **Navigation:** sidebar `NavItem` and global search entries get the same `permission`.                                                                                                                                                                 | `app-sidebar.tsx`, `use-search-items.tsx` |
| 10  | **Tests:** a user with the permission is allowed, a user without it gets 403 for **each** route, and the guard test passes.                                                                                                                            | `tests/Feature`                           |

Never check role names in feature code (`hasRole('Manager')`). Always check
permissions, so administrators can build any role they need. The only
role-aware code is the Admin bypass and the delegation rules.

### What the guard test enforces

`RoutePermissionsTest` inspects every authenticated route in the app (package
sign-in flows like Fortify and passkeys are excluded) and fails when:

- **a route has no `can:` middleware**, unless it's on an explicit allowlist:
    - `PERSONAL_ROUTES` / `PERSONAL_URIS`: the user's own profile, security settings, notifications and dashboard.
    - `CONTROLLER_AUTHORIZED_ROUTES`: routes that authorize in the controller; each is also checked to return 403 for a user without permissions.
- **a route uses a permission that isn't in `config/permissions.php`**, e.g. a typo or a forgotten registration.

Only add a route to an allowlist when it truly acts on the signed-in user's own
data, and say why in a comment.

## Adding permissions for a new module

1. Register the permissions:

    ```php
    // config/permissions.php
    'orders' => ['view', 'create', 'update', 'delete', 'approve'],
    ```

2. Create them. This also grants them to Admin, and the Docker entrypoint
   runs it on every deploy:

    ```bash
    php artisan permissions:sync
    ```

    This is the only way permissions are created. The Permissions view is
    read-only: there is no UI for creating, renaming or deleting them, because
    code depends on the exact names. Removing an entry from the config never
    deletes the permission. If a feature is retired, delete its permissions
    with a migration.

3. Protect the routes with the permission, never with a role:

    ```php
    Route::get('orders', [OrderController::class, 'index'])->middleware('can:orders.view');
    Route::post('orders/{order}/approve', ApproveOrderController::class)->middleware('can:orders.approve');
    ```

4. Authorize anywhere else with the standard API:

    ```php
    $request->user()->can('orders.approve');
    Gate::authorize('orders.approve');
    ```

    When the resource itself matters (ownership, status, ...), use a policy
    that starts from the permission:

    ```php
    public function update(User $user, Order $order): bool
    {
        return $user->can('orders.update') && $order->isEditable();
    }
    ```

5. Hide UI the user can't use. This is for UX only; the backend decides:

    ```tsx
    const { can } = useAuthorization();

    {
        can('orders.approve') && <Button>Approve</Button>;
    }
    ```

    For a sidebar entry, add `permission: 'orders.view'` to its `NavItem`.

Administrators can now build roles such as "Order Approver" from
**Administration → Roles & permissions**. No other code changes are needed.

## Security rules (enforced on the server)

- Every management route has a `can:` middleware for its permission. Form
  requests authorize again and validate names against the `web` guard.
- **Admin role:** it can't be renamed, edited or deleted. Only an Admin can
  assign or remove it.
- **Last administrator:** they can't lose the Admin role or delete their own
  account.
- **Delegation for non-admins:**
    - They can only create or edit roles using permissions they hold.
    - They can only edit, delete or assign roles whose permissions they fully
      hold.
    - They can only grant or revoke direct permissions they hold.
    - Only roles and permissions that actually change are checked.
- **Permissions are defined in code:** nobody, including Admins, can create,
  rename or delete permissions over HTTP. `permissions:sync` rejects names
  that don't follow `resource.action`.
- **Managing user accounts:** changing someone's email or password lets you
  sign in as them. So a non-Admin can only edit or delete users whose
  permissions they fully hold, never an Admin. Nobody can delete their own
  account from the users page (profile settings handles that), and the last
  Admin can't be deleted.
- **New users:** roles chosen when creating a user follow the same delegation
  rules as Manage access. Accounts created by an administrator are marked as
  email-verified.
- **Atomic updates:** a user's roles and direct permissions are updated in one
  transaction.

## Users page

`/admin/users` lists users, with search and a role filter. Each action needs
its own permission:

- **Create user:** `users.create`. Name, email, password and optional roles.
- **Edit user:** `users.update`. Name, email and an optional new password.
- **Manage access:** `users.update`. Roles and direct permissions.
- **Delete user:** `users.delete`. `App\Actions\Users\DeleteUser` also removes
  the user's notifications and avatar; profile-settings deletion uses the same
  action.

## Roles & permissions page

`/admin/roles` combines everything on one page, with three views:

- **Roles:** role cards, with create, edit and delete.
- **Matrix:** which role has which permission.
- **Permissions:** a read-only list of every permission, its roles and how many users hold it directly.

The page opens for anyone with `roles.view` or `permissions.view`. The Roles
and Matrix views need `roles.view`, and the Permissions view needs
`permissions.view`. The server only sends the data for views the user may see.
`?view=permissions` opens a specific view.

## Frontend data

Each Inertia response shares `auth.roles`, `auth.permissions` (the effective
names) and `auth.isAdmin`, for the signed-in user only. The `roles` and
`permissions` relations are hidden from the serialized user.

## Audit logging

`permission.events_enabled` is on. Spatie dispatches `RoleAttachedEvent`,
`RoleDetachedEvent`, `PermissionAttachedEvent` and `PermissionDetachedEvent`,
and the Role and Permission models fire the normal Eloquent
created/updated/deleted events. To add an audit log, listen to these events.
The management code doesn't need to change.

## Octane

`permission.register_octane_reset_listener` is on, so every worker reloads
permissions after a change instead of serving stale ones from memory.
