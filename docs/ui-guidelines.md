# UI guidelines

Every page in the app should look and behave the same way. This document is
the reference for page layout, tables, forms, dialogs, icons and permissions
in the UI. Reuse the shared components listed here; don't restyle them per
page.

> Where everything lives: [`docs/architecture.md`](architecture.md). What changed: [`CHANGELOG.md`](../CHANGELOG.md).
>
> Building a page or table with an AI agent? The `ui-page-and-table` skill
> (`.ai/skills/ui-page-and-table/SKILL.md`) has step-by-step templates that
> follow these rules.

## Stack

- React 19, Inertia v3, TypeScript, Tailwind CSS v4 and shadcn/ui (`resources/js/components/ui`).
- Routes come from Wayfinder: `@/actions/...` (controller actions) and `@/routes/...` (named routes). Never hardcode URLs.
- Icons are **HugeIcons only**. Don't add `lucide-react` or another icon library.
- Text is translated with i18next (`t('key')`) from `lang/*.json`, and every page supports right-to-left. See section 9 and [`docs/localization.md`](localization.md).

## 1. Page anatomy

Every authenticated page is a file in `resources/js/pages/**`. The app layout
(sidebar and header) is applied automatically.

```tsx
export default function OrdersIndex(props: Props) {
    const { t } = useTranslation();

    return (
        <>
            <Head title={t('navigation.orders')} />
            <div className="p-4 md:p-6">{/* content */}</div>
        </>
    );
}

OrdersIndex.layout = () => ({
    // Breadcrumb titles are translation keys (literal: true for data).
    breadcrumbs: [
        { title: 'navigation.orders', href: OrderController.index() },
    ],
});
```

| Rule         | Details                                                                                                                                                                                                                            |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Page padding | `p-4 md:p-6` on the outer wrapper. Stack blocks with `flex flex-col gap-6`.                                                                                                                                                        |
| Title        | Always set `<Head title={t('…')} />`.                                                                                                                                                                                              |
| Breadcrumbs  | Always set them through `Page.layout`. Each level links to its page.                                                                                                                                                               |
| Back buttons | **Don't add them.** The breadcrumbs handle navigation back.                                                                                                                                                                        |
| Page heading | A list page puts its title inside the `DataTable` header. Any other page with a heading uses `h1.text-xl.font-semibold.tracking-tight` plus a `p.text-muted-foreground.text-sm` description, with its primary action on the right. |
| Width        | Use the full width. Only narrow reading-style pages (e.g. notifications) use `mx-auto max-w-3xl`.                                                                                                                                  |

## 2. Tables: always use `DataTable`

Any paginated list uses `@/components/data-table/data-table`. It renders a
single card with:

- **Header:** title and description on the left; search, the filter button (`FilterIcon`) and actions on the right.
- **Body:** columns with optional sorting, and the empty state inside the table.
- **Footer:** pagination (`SimplePagination`).

Style changes to tables go in `components/data-table/*`, so every table
updates together. Don't build a one-off table layout for a single page.

### Frontend

```tsx
const columns: DataTableColumn<Order>[] = [
    {
        id: 'number',
        header: 'Order',
        sortKey: 'number',
        cell: (o) => o.number,
        className: 'font-medium',
    },
    { id: 'status', header: 'Status', cell: (o) => <Badge>{o.status}</Badge> },
    {
        id: 'created',
        header: 'Created',
        sortKey: 'created_at',
        visibleFrom: 'md',
        cell: (o) => formatDate(o.created_at),
    },
    {
        id: 'actions',
        header: <span className="sr-only">Actions</span>,
        align: 'right',
        className: 'w-0',
        cell: (o) => <OrderActions order={o} />,
    },
];

<DataTable
    title="Orders"
    description="All orders placed in this workspace."
    url={OrderController.index.url()}
    paginator={orders}
    columns={columns}
    rowKey={(order) => order.id}
    search={{ value: filters.search, placeholder: 'Search orders' }}
    filters={[
        {
            key: 'status',
            label: 'Status',
            value: filters.status,
            allLabel: 'All statuses',
            options,
        },
    ]}
    sort={sort}
    actions={
        can('orders.create') && (
            <Button asChild>
                <Link href={OrderController.create.url()}>
                    <Icon iconNode={Add01Icon} />
                    Create order
                </Link>
            </Button>
        )
    }
    noun="orders"
    emptyMessage="There are no orders yet."
    emptyFilteredMessage="No orders match your search or filters."
/>;
```

| Column option    | Use                                                                                                                      |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `sortKey`        | Makes the header sortable. It must match a key in the controller's `SortOrder` map.                                      |
| `visibleFrom`    | Hides the column below a breakpoint (`sm`, `md`, `lg`, `xl`). Keep the identifying column and actions visible on mobile. |
| `align: 'right'` | For actions and numbers.                                                                                                 |
| `wrap`           | Lets badge lists or long text wrap.                                                                                      |
| `className`      | E.g. `w-0` for the actions column, `text-muted-foreground` for secondary data.                                           |

- The main identifying cell gets a minimum width (e.g. `min-w-48`), so it stays readable on mobile. The table scrolls sideways inside its card.
- **Row actions:** one primary outline button if needed (e.g. "Manage access"), plus a `MoreHorizontalIcon` dropdown for Edit and Delete. Hide actions the user can't perform.

### Views, local data and groups

The same `DataTable` covers pages with several views and non-paginated data.
`pages/admin/roles/index.tsx` is the reference:

- **Tabs:** `tabs`, `activeTab` and `onTabChange` render view buttons in the header, e.g. Roles / Matrix / Permissions. Render one `DataTable` per view with a `key` so each view keeps its own state, and keep the active view in `?view=`.
- **Local mode:** pass `rows` instead of `paginator` for small, already-loaded lists. Give `search` and each filter an `onChange` and filter the rows yourself. The footer shows a count instead of pagination.
- **Group rows:** pass `groupBy` (and optionally `groupLabel`) to render section rows, e.g. permissions grouped by resource. Rows must already be sorted by group.
- **Don't:** build card grids, custom tables or separate view switchers for list data; use `DataTable`.

### Backend contract

```php
public function index(Request $request): Response
{
    $search = trim((string) $request->query('search', ''));
    $status = in_array($request->query('status'), Order::STATUSES, true) ? $request->query('status') : null;

    $sort = SortOrder::fromRequest($request, [
        'number' => 'number',
        'created_at' => 'created_at',
    ], default: 'created_at', defaultDirection: SortOrder::DESC);

    $orders = Order::query()
        ->when($search !== '', fn ($query) => $query->whereLike('number', "%{$search}%"))
        ->when($status, fn ($query) => $query->where('status', $status))
        ->tap($sort->apply(...))
        ->paginate(20)
        ->withQueryString()
        ->through(fn (Order $order) => [/* only the fields the page needs */]);

    return Inertia::render('orders/index', [
        'orders' => $orders,
        'filters' => ['search' => $search, 'status' => $status],
        'sort' => $sort->toArray(),
    ]);
}
```

- Validate filter values against known values; unknown values mean "no filter".
- Sort only through `App\Support\SortOrder`, which accepts only the keys you list.
- Paginate on the server (20 per page by default) and always call `withQueryString()`.
- Eager load relations you display, and use `withCount()` for counts (no N+1 queries).
- Return plain arrays with only the fields the page needs; never whole models.

## 3. Forms

Create and edit pages share one form component (e.g. `components/users/user-form.tsx`, `components/authorization/role-form.tsx`).

```tsx
<form onSubmit={submit} className="space-y-6 md:pb-24">
    <FormSection title="Order details" description="…" className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
            <Label htmlFor="number">Number *</Label>
            <Input id="number" value={form.data.number} onChange={…} required />
            <InputError message={form.errors.number} />
        </div>
    </FormSection>

    <UnsavedChangesBar
        visible={form.isDirty}
        processing={form.processing}
        saveLabel="Create order"
        onReset={() => {
            form.reset();
            form.clearErrors();
        }}
    />
</form>
```

| Rule          | Details                                                                                                                                                        |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Sections      | Group fields in `FormSection` cards: a muted title and description, then the fields.                                                                           |
| Field wrapper | `grid content-start gap-2`. `content-start` stops inputs shifting when the field beside them shows an error.                                                   |
| Layout        | Two columns on `md` for short fields, one column for long ones.                                                                                                |
| Required      | Put `*` in the label.                                                                                                                                          |
| Errors        | `<InputError message={form.errors.field} />` directly under the field. General errors (e.g. `errors.role`) go in a red alert at the top of the form.           |
| Saving        | No Save / Cancel buttons. Use `UnsavedChangesBar` (see below). For read-only views, render no bar.                                                             |
| Activity log  | What the form saves must appear in `/activities`: an `Auditable` model, or an explicit `ActivityLoggerInterface` entry for pivots and actions (see section 8). |
| Forms         | Inertia `useForm` (or `<Form>`) with Wayfinder URLs, and `preserveScroll: true`.                                                                               |
| Read-only     | Render the same form with inputs disabled and a short explanation, rather than a separate layout.                                                              |

### Unsaved changes bar

`@/components/unsaved-changes-bar` replaces the classic Save / Cancel buttons
on **every** create and edit form. It appears only while the form has unsaved
changes.

- **Desktop:** a floating pill at the bottom center of the full page width (the window,
  not the content area next to the sidebar), and slides up. It
  shows "You have changes that haven't been saved yet.", **Reset**, and the
  primary save button with an `Enter` hint.
- **Mobile:** it slides down over the page header and covers it with
  "Unsaved changes", **Reset** and **Save**.
- **Enter** saves. Text inputs submit the form natively. Enter anywhere else on
  the page also saves, except in textareas, buttons, links, dialogs and menus.

| Prop              | Use                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `visible`         | Almost always `form.isDirty`.                                                                                                                                          |
| `onReset`         | `form.reset()` then `form.clearErrors()`.                                                                                                                              |
| `processing`      | `form.processing`. Disables the buttons and shows a spinner.                                                                                                           |
| `saveLabel`       | The action, e.g. `Create user`, `Save changes`, `Save access`.                                                                                                         |
| `onSave` / `form` | Optional. By default Save submits the surrounding `<form>`, so its `onSubmit` runs. Pass `form="id"` when the bar is outside the form, or `onSave` for non-form saves. |

**Rules**

- Render the bar **inside** the `<form>`. Give the form `md:pb-24` so the pill never covers the last field.
- `isDirty` compares against the form's defaults. Normalize arrays (e.g. sort them) when creating the form, so toggling a value back hides the bar again.
- **After saving:**
    - If the page redirects away, nothing else is needed.
    - If it stays open, call `form.setDefaults()` in `onSuccess` so the saved values become the new baseline and the bar hides.
- After a failed save the bar stays visible and field errors show; don't reset the form on error, except password fields.
- Don't add a Cancel link; the breadcrumbs navigate away.

## 4. Dialogs, destructive actions and feedback

- Every delete goes through `ConfirmDialog` (`@/components/confirm-dialog`):
    - Title: `Delete "<name>"?`
    - Say exactly what is deleted and what's affected (e.g. "assigned to 8 users").
    - End with "This action cannot be undone."
    - Show server errors inside the dialog with `<InputError />`.
- **Success feedback:** flash a toast from the controller; don't build custom banners.

    ```php
    Inertia::flash('toast', ['type' => 'success', 'message' => __('Order created successfully.')]);
    ```

- **Toast wording:** "<Thing> created successfully." / "updated successfully." / "deleted successfully."

## 5. Icons (HugeIcons)

```tsx
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Icon } from '@/components/ui/icon';

<Icon iconNode={Add01Icon} className="size-4" />;
```

Always render icons through `Icon`. Use the same icon for the same meaning
everywhere:

| Meaning                      | Icon                                                    |
| ---------------------------- | ------------------------------------------------------- |
| Create / add                 | `Add01Icon`                                             |
| Edit                         | `Edit02Icon`                                            |
| Delete                       | `Delete02Icon`                                          |
| Row actions menu             | `MoreHorizontalIcon`                                    |
| Search                       | `Search01Icon`                                          |
| Filter                       | `FilterIcon`                                            |
| Sort (inactive / asc / desc) | `ArrowUpDownIcon` / `ArrowUp01Icon` / `ArrowDown01Icon` |
| Yes / no (matrix)            | `Tick02Icon` / `Cancel01Icon`                           |
| Previous / next              | `ArrowLeft01Icon` / `ArrowRight01Icon`                  |
| Notifications                | `Notification03Icon`                                    |
| Users                        | `UserGroupIcon`                                         |
| Roles & permissions          | `UserShield01Icon`                                      |
| Manage access                | `UserLock01Icon`                                        |
| Dashboard                    | `Home09Icon`                                            |
| Activities                   | `Activity01Icon`                                        |

- Check a name exists before using it: `grep -q "export declare const NameIcon" node_modules/@hugeicons/core-free-icons/dist/types/index.d.ts`.
- Icon-only buttons need an `aria-label`.
- Default size comes from the parent (`size-4` in buttons); use `size-5` in the header.

## 6. Visual language

- **Colors:** use theme tokens (`bg-card`, `border`, `text-muted-foreground`, `bg-muted`, `bg-accent`, `text-destructive-foreground`) so light and dark mode both work.
- **Status colors:** only for status, always with a dark variant, e.g. `text-emerald-600 dark:text-emerald-400`. Notification levels use sky (info), emerald (success), amber (warning) and red (error).
- **Cards:** `bg-card rounded-xl border`.
- **Badges:** `Badge`, or `RoleBadge` for roles. `SystemRoleBadge` marks protected items.
- **Empty states:** a short sentence, with a different message when filters are active.
- **Dates:** `toLocaleDateString()` in tables, and `formatRelativeTime()` (`lib/notifications.ts`) for activity.
- **Mobile:** check a 390px-wide viewport. No page-level horizontal scroll; headers stack; secondary columns hide with `visibleFrom`.

## 7. Permissions in the UI

- `const { can, canAny } = useAuthorization();` hides UI the user can't use. This is **UX only**; routes and Form Requests must enforce the same permissions (`can:` middleware).
- **Sidebar:** add a `NavItem` with `permission` (a string, or an array meaning "any of") to `components/app-sidebar.tsx`, under **Workspace** or **Administration**.
- **Global search (pages):** add the page to `hooks/use-search-items.tsx` with the same `permission`.
- **Global search (records):** the palette (⌘K) also searches records on the server, grouped as Users, Roles and Permissions, with at most 5 results per group. To make a module's records searchable:
    1. Implement `App\Search\SearchProvider`: `key()`, `label()`, `permission()` and `search($user, $term, $limit)` returning `SearchResult`s with a title, a short description, an `href` the user may open, and an icon name.
    2. Add the class to `GlobalSearch::PROVIDERS`, and add its permission to the `search` entry in `CONTROLLER_AUTHORIZED_ROUTES` (`RoutePermissionsTest`).
    3. Map the icon name in `hooks/use-remote-search.ts` and add the permission to `SEARCH_PERMISSIONS` there.
    4. Test: matches, the 5-result limit, and that users without the permission don't get the group.
- **New permissions (required for every feature):** follow "Every new feature needs permissions" in `docs/authorization.md`. `RoutePermissionsTest` fails when a route isn't protected.

## 8. Activity logging (required)

Every page, form or button that **does something** must leave a trace in the
activity log (`/activities`). That includes creating, editing and deleting
records, and actions like export, import, connect, sync, approve or assign.
Users see their own history there, and administrators see everyone's. See
`docs/activity-log.md` for the full reference.

| The page…                                                             | Do this                                                                                                                                                                                         |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Creates, edits or deletes a model                                     | Add `use Auditable` to the model and give it an `activityLabel()` (e.g. `"Order {$this->number}"`). The observer records `created` / `updated` / `deleted` automatically; don't log them again. |
| Changes relationships (pivots such as roles, tags, members)           | Log one entry per change with `ActivityLoggerInterface` (`assigned`, `unassigned`…). See `LogAccessChanges`.                                                                                    |
| Runs an action that isn't a model save (export, sync, connect, send…) | Log it with `ActivityLoggerInterface::log(action: 'exported', …)`, with the record as `subject` when there is one.                                                                              |
| Updates or deletes many rows with one query                           | Update models one by one, or log one entry describing the bulk change (count and filters).                                                                                                      |
| Has private or noisy fields                                           | Hide them with `auditExclude()`. Passwords, tokens and secrets are never stored.                                                                                                                |

- **New actions:** give each new action a verb, icon and color in `resources/js/lib/activity-presentation.ts`.
- **Tests:** assert the activity in the feature test, e.g. `Activity::where('action', 'exported')->sole()`.
- **Guard test:** `AuditableModelsTest` fails when a model in `app/Models` isn't `Auditable`. Only allowlist a model that users never change, and say why.

## 9. Text, translations and right-to-left (required)

Every string is translated (English, French, Arabic) and every layout works
right-to-left. Full rules: [`docs/localization.md`](localization.md).

- **No hardcoded text:** titles, labels, placeholders, aria-labels, empty
  states, toasts and dialog text use `t('area.key')`; server messages use
  `__('area.key')`. Add each key to `lang/en.json`, `lang/fr.json` and
  `lang/ar.json` (plural keys need each language's forms).
- **Static layout config** stores keys: breadcrumbs
  `{ title: 'navigation.orders', href }`, or `{ title: order.number, href, literal: true }` for data.
- **`DataTable`:** translated `title`, `header`, `placeholder`, filter
  `label`/`allLabel`, `emptyMessage`, and `countLabel={(count) => t('orders.count', { count })}`;
  action columns use `align: 'end'`.
- **Dates and numbers:** `useFormatters()` (`relativeTime`, `dateTime`, `date`,
  `number`), never `toLocaleString()`.
- **RTL:** logical classes only (`ms-`/`me-`, `ps-`/`pe-`, `start-`/`end-`,
  `text-start`/`text-end`, `border-s`/`border-e`, `gap` instead of `space-x`);
  forward/back arrows and chevrons get `rtl:rotate-180`; emails, IPs, URLs and
  identifiers are wrapped in `<Ltr>`; direction logic uses `useLocale().isRtl`.
- **Data stays as-is:** never translate names, emails, role names or
  identifiers; show a translated label beside identifiers.

## 10. Checklist before finishing a page

- [ ] `<Head title>`, breadcrumbs, `p-4 md:p-6`, and no back button.
- [ ] Lists use `DataTable`, with server-side search, filters, `SortOrder` and pagination.
- [ ] Forms use `FormSection`, `InputError`, and `UnsavedChangesBar` (no Save / Cancel buttons).
- [ ] Deletes use `ConfirmDialog`, and success shows a toast.
- [ ] Only HugeIcons, through `Icon`, following the table above.
- [ ] Buttons and links hidden with `can()`, and the same permission enforced on the server.
- [ ] Every create, update, delete and action is recorded in the activity log (`Auditable` model, or `ActivityLoggerInterface`), with a test.
- [ ] Sidebar and global search entries added if the page is a destination.
- [ ] Every visible string, placeholder, aria-label and toast is a translation key present in all `lang/*.json` files; dates and numbers use `useFormatters()`.
- [ ] Logical (RTL-safe) classes, flipped directional icons, `<Ltr>` for technical values.
- [ ] Looks right in dark mode and at 390px wide, in English, French and Arabic (RTL).
- [ ] `php artisan wayfinder:generate`, `npx vp check --fix`, `npx tsc --noEmit`, `npm run build` and `php artisan test` all pass.
