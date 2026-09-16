# Roles & permissions

Role-based access control is built on
[spatie/laravel-permission](https://spatie.be/docs/laravel-permission) (v8)
and Laravel's Gate. The system only knows about **users**, **roles** and
**permission names**. Each module decides which permission its actions need.

## Concepts

| Concept         | Where                                           | Notes                                                                                             |
| --------------- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| Permission list | `config/permissions.php`                        | The one canonical list, as `resource => [actions]`. It produces `resource.action` names.          |
| Admin role      | `App\Authorization\SystemRole::ADMIN`           | Passes every Gate check. Can't be renamed, edited or deleted. There is always at least one Admin. |
| Custom roles    | Database                                        | Created at runtime under **Administration → Roles**. There is no role enum.                       |
| Delegation      | `App\Authorization\PermissionDelegation`        | Non-admins can only grant permissions they hold. Only an Admin can grant or remove Admin.         |
| Naming rules    | `App\Authorization\PermissionRegistry::PATTERN` | `^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$`, e.g. `reports.export` or `purchase_orders.approve`.         |

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

    This is the only way permissions are created. The Permissions page is
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
**Administration → Roles**. No other code changes are needed.

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
- **Atomic updates:** a user's roles and direct permissions are updated in one
  transaction.

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
