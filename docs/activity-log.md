# Activity log

A generic, **read-only** audit trail of what users (and the system) did. Every
entry lives in a single `activities` table and works with any Eloquent model.
Nothing in the app can create, edit or delete entries except the logger.

```text
Auditable model ──► ActivityObserver ──┐
                                        ├──► ActivityLogger ──► activities table
Controller / service / listener ────────┘
```

## Every action needs an activity

This is a project rule. Any page, form, endpoint, job or command that
**creates, changes or deletes data, or performs an action** must record it
here:

1. **Models users change:** `use Auditable` plus `activityLabel()`. The observer logs create, update and delete.
2. **Pivots, bulk queries and non-model actions:** call `ActivityLoggerInterface::log()` once per meaningful change.
3. **Frontend:** add new custom actions to `resources/js/lib/activity-presentation.ts`.
4. **Tests:** assert the activity in the feature's tests.

`tests/Feature/Activity/AuditableModelsTest.php` fails when a model in
`app/Models` doesn't use `Auditable`. Only models users never change may be
allowlisted there (e.g. `Activity` itself), with a reason.

## What gets recorded

| Source                                            | Actions                                                                                           | How                                          |
| ------------------------------------------------- | ------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Models using `Auditable` (e.g. `User`)            | `created`, `updated`, `deleted`; plus `trashed`, `restored` and `force_deleted` with soft deletes | `App\Observers\ActivityObserver`, automatic  |
| Sign-in / sign-out                                | `login`, `logout`                                                                                 | `App\Listeners\LogAuthenticationActivity`    |
| Role and permission changes (Spatie pivot tables) | `created`/`updated`/`deleted` role, `assigned`/`unassigned` role, `granted`/`revoked` permission  | `App\Actions\Authorization\LogAccessChanges` |
| Password changes (the value is never stored)      | `password_changed`                                                                                | `SecurityController`, `Admin\UserController` |
| New permissions synced from config                | `synced`                                                                                          | `App\Actions\Authorization\SyncPermissions`  |

Each entry stores:

- **Actor:** `user_id`, or null for "System", e.g. console commands, jobs and the scheduler.
- **Action:** a free-form string.
- **Subject:** polymorphic `subject_type` and `subject_id`, plus a `subject_label` snapshot so the entry stays readable after the record is deleted.
- **Description:** plain text.
- **Changes:** only the changed `old_values`, `new_values` and `changed_fields`.
- **Context:** `metadata`, plus the IP and user agent for HTTP requests.

`created_at` is set once; there is no `updated_at`.

## Making a model auditable

```php
use App\Models\Concerns\Auditable;

class Invoice extends Model
{
    use Auditable;

    // Optional: human label kept with every entry (default "Invoice #12").
    public function activityLabel(): string
    {
        return "Invoice {$this->number}";
    }

    // Optional: never log these (in addition to the safe defaults below).
    public function auditExclude(): array
    {
        return ['internal_notes'];
    }

    // Optional: log only these fields (exclusions still apply).
    public function auditInclude(): array
    {
        return [];
    }
}
```

Nothing else is needed. Models are **opt-in**: notifications, activities,
sessions, jobs and Spatie's internal models are never observed automatically.

### What is never stored

These rules apply to every model and can't be overridden:

1. **Sensitive names:** `password`, `password_confirmation`, `current_password`, `remember_token`, `token`, `api_token`, `access_token`, `refresh_token`, `secret`, `client_secret`, `private_key`, `two_factor_secret`, `two_factor_recovery_codes`, `authorization`, `cookie`, `session`. They're also matched as a suffix, e.g. `github_access_token`. See `App\Activity\AuditableAttributes::SENSITIVE`.
2. **The model's `$hidden` attributes.**
3. **Timestamps and the primary key.**
4. **`auditExclude()` fields.** After these removals, a non-empty `auditInclude()` keeps only the fields it lists.
5. **Oversized or binary values:** strings over 500 characters are truncated, binary data becomes `[binary data]`, and large arrays become `[large value]`.

If an update only changes ignored fields (e.g. `updated_at` or a token), no
entry is written.

## Logging custom actions

Use `App\Contracts\ActivityLoggerInterface` for things observers can't see:

```php
$activity->log(
    action: 'connected',
    description: 'Connected MeditLink integration',
    subject: $integration,
    metadata: ['provider' => 'meditlink'],
);

$activity->log(action: 'exported', description: 'Exported monthly report', metadata: ['report' => 'monthly']);
```

- **Actions** are free-form, lowercase `snake_case`. Common ones are in `App\Activity\ActivityAction`.
- **Actor:** defaults to the signed-in user; pass `actor:` explicitly in listeners or jobs.
- **Description:** defaults to "<Action> <type> <label>", e.g. "Connected integration MeditLink".
- **Metadata:** never put secrets, tokens or full request payloads here.

### Avoid duplicates

- Normal create, update and delete of an `Auditable` model is handled by the **observer**. Don't log it again.
- Only use the **logger** for actions with no model event: pivots, sign-in/out, exports, syncs, integrations and bulk operations.

### Bulk updates and deletes

Query-builder operations **don't fire model events**, so this writes no
activity:

```php
Order::where('status', 'pending')->update(['status' => 'cancelled']); // not audited
```

Either update the models one by one (`->each->update([...])`) so each change
is recorded, or log one explicit entry for the operation:

```php
$count = Order::where('status', 'pending')->update(['status' => 'cancelled']);
$activity->log(action: 'bulk_updated', description: "Cancelled {$count} pending orders", metadata: ['count' => $count]);
```

## Viewing activity

`/activities` (sidebar: **Workspace → Activities**) is read-only:

- **Everyone** sees only activity they performed themselves (`user_id` = them). A `?user=` parameter is ignored for them.
- **`activities.view.all`** (Admin by default) sees everyone's activity, can filter by user, and gets "View activities" in the Users row menu (`/activities?user={id}`).
- **Filters:** search, action and date range. Search covers description, record label, and, for `view.all`, the actor's name and email. Filters live in the query string.
- **Loading:** 20 entries at a time with cursor pagination (`Inertia::scroll` + `<InfiniteScroll>`), newest first. Changing a filter resets the list.
- **Writes:** there are no create, update or delete routes. The `Activity` model throws if it's updated or deleted.

The timeline presentation (verb, icon and color per action) lives in
`resources/js/lib/activity-presentation.ts`. Add new custom actions there;
unknown actions fall back to a neutral style.

## Performance

- The table is append-only, so `id` follows creation order. The feed pages on `id DESC` with a cursor, using the primary key index.
- **Indexes:**
    - `(user_id, id)`: a user's history
    - `(subject_type, subject_id, id)`: a record's history
    - `(action, id)`: the action filter
    - `created_at`: date ranges
- No foreign key on `user_id` or the subject, so history is kept when users or records are deleted. The UI shows "Deleted user" when the actor no longer exists.
