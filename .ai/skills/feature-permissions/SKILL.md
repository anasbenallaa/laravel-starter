---
name: feature-permissions
description: 'Declares and enforces roles & permissions for every new or changed feature. Load this FIRST whenever adding a feature, module, page, route, controller, action, button, menu or sidebar entry, or CRUD for a resource (orders, invoices, patients, integrations, reports...); also when the user mentions permissions, roles, access, authorization, "who can", "only admins" or protecting a page.'
license: MIT
metadata:
    author: project
---

# Feature permissions

Every feature in this app is protected by permissions (Spatie Permission +
Laravel Gate). A feature is **not done** until its permissions are declared,
enforced on the server, reflected in the UI and tested.

## When to apply

Activate **before writing code** when you:

- Add a resource, module, page, route or controller.
- Add a new action on an existing resource (e.g. approve, export, sync).
- Add buttons, row actions, sidebar or global search entries.
- Change who can do something.

## Step 0: read

1. `docs/authorization.md`, especially **Every new feature needs permissions** and **Security rules**.
2. `config/permissions.php`, to see the existing resources and naming.
3. If the feature has UI, also load the `ui-page-and-table` skill.

## Step 1: declare

```php
// config/permissions.php: the only place permissions are defined
'orders' => ['view', 'create', 'update', 'delete', 'approve'],
```

- Names are `resource.action`, lowercase snake_case, exactly one dot (`App\Authorization\PermissionRegistry::PATTERN`).
- Use CRUD actions plus specific verbs (`approve`, `export`, `connect`). Don't reuse another resource's permission.
- Never create permissions in migrations, seeders or the UI. Then run `php artisan permissions:sync`.

## Step 2: enforce on the server

1. **Routes:** every route gets `->middleware('can:<resource>.<action>')`.

    ```php
    Route::get('orders', [OrderController::class, 'index'])->middleware('can:orders.view')->name('orders.index');
    Route::post('orders/{order}/approve', ApproveOrderController::class)->middleware('can:orders.approve')->name('orders.approve');
    ```

    Only when middleware can't express the rule (e.g. "either of two permissions"), authorize in the controller with `abort_unless($request->user()->canAny([...]), 403)`. Then add the route to `CONTROLLER_AUTHORIZED_ROUTES` in `tests/Feature/Authorization/RoutePermissionsTest.php`.

2. **Form Requests:** `authorize()` returns `$this->user()->can('orders.create')`.
3. **Record-level rules:** use a policy that starts from the permission, e.g. `return $user->can('orders.update') && $order->isEditable();`.
4. **Granting access:** if the feature assigns roles or permissions, validate with `App\Authorization\PermissionDelegation` (`undelegable`, `canManageRole`, `canManageUser`).
5. **Never** check role names (`hasRole('Manager')`, `$user->role === ...`) in feature code. Admin already passes every check through `Gate::before`.

## Step 3: reflect in the UI (UX only)

```tsx
const { can } = useAuthorization();

{
    can('orders.create') && <Button>Create order</Button>;
}
```

- Hide buttons, row actions and menu items the user can't use.
- **Sidebar:** `{ title: 'Orders', href: OrderController.index(), icon, permission: 'orders.view' }` in `components/app-sidebar.tsx`.
- **Global search:** the same `permission` in `hooks/use-search-items.tsx`.
- Frontend checks never replace Step 2.

## Step 3b: audit the feature

- **Auditing:** models that users create, change or delete must `use App\Models\Concerns\Auditable`, and set `activityLabel()` (e.g. `"Order {$this->number}"`) and `auditExclude()` for private fields. See `docs/activity-log.md`.
- **Custom actions:** pivot changes, exports, syncs, integrations and bulk query updates don't fire model events, so log them with `ActivityLoggerInterface::log()`. Don't also log standard model CRUD (the observer already does).

## Step 4: test (Pest)

For **each** route, test that:

- a user with the permission gets 200, a redirect or a success;
- a user without it gets **403**, and nothing changed in the database.

```php
test('orders require orders.view', function () {
    $this->actingAs(userWithPermissions(['orders.view']))->get(route('orders.index'))->assertOk();
    $this->actingAs(userWithPermissions([]))->get(route('orders.index'))->assertForbidden();
});
```

Helpers in `tests/Pest.php`:

- `seedAccessControl()`
- `createAdmin()`
- `userWithPermissions([...], 'Role name')`

## Step 5: verify

```bash
php artisan permissions:sync
php artisan test --compact tests/Feature/Authorization
php artisan test --compact
```

`RoutePermissionsTest` must pass. It fails for:

- **a route without `can:` middleware:** add the middleware. Only allowlist truly personal routes, with a comment explaining why.
- **a permission missing from `config/permissions.php`:** register it and sync.

## Checklist

- [ ] Permissions added to `config/permissions.php` and synced.
- [ ] Every route has `can:` middleware, or is controller-authorized and on the allowlist.
- [ ] Form Requests authorize, and policies are used for record-level rules.
- [ ] No role-name checks in feature code.
- [ ] UI hides unavailable actions; sidebar and search entries have `permission`.
- [ ] Changed models use `Auditable`; custom and bulk actions are logged through `ActivityLoggerInterface`.
- [ ] 403 tests for each route; guard test and full suite green.

## Common mistakes

- Adding a route without `can:` because "only admins see the menu". Hidden links don't protect routes.
- Creating a permission from a seeder or the UI instead of `config/permissions.php`.
- Checking `hasRole('Admin')` instead of a permission.
- Forgetting to sync, so the permission doesn't exist and even roles that should have it are denied.
- Allowlisting a route in the guard test to make it pass.
