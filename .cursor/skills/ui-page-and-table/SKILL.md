---
name: ui-page-and-table
description: 'Builds new pages, list/table pages, create/edit forms and admin screens so they match the app''s UI conventions. Load this FIRST whenever creating or restyling a page in resources/js/pages, adding a table or list, a create/edit form, a delete dialog, sidebar or global search entries, or choosing icons; also when the user says "new page", "create a page", "add a table", "list page", "CRUD", "form page" or "same style as the other pages".'
license: MIT
metadata:
    author: project
---

# UI page and table

## When to apply

Activate this skill **before writing any code** when you:

- Create a new page under `resources/js/pages/**`.
- Add a paginated list or table, with search, filters or sorting.
- Build a create or edit form, or a delete confirmation.
- Add a sidebar link or global search entry, or pick icons.

## Step 0: read the rules

Read `docs/ui-guidelines.md` in full. It is the source of truth for layout,
tables, forms, dialogs, icons, colors and permissions. The steps below apply
those rules; don't deviate from them.

Then read one existing page of the same kind and copy its structure:

| Building                        | Reference                                                                                          |
| ------------------------------- | -------------------------------------------------------------------------------------------------- |
| Paginated table page            | `resources/js/pages/admin/users/index.tsx` + `app/Http/Controllers/Admin/UserController.php@index` |
| Create / edit form              | `resources/js/pages/admin/users/{create,edit}.tsx` + `resources/js/components/users/user-form.tsx` |
| Card grid with view toggle      | `resources/js/pages/admin/roles/index.tsx`                                                         |
| Grouped checkbox form           | `resources/js/components/authorization/role-form.tsx`                                              |
| Form that stays open after save | `resources/js/pages/admin/users/access.tsx`                                                        |

## Step 1: backend (controller, routes, requests)

1. **Controller** actions return `Inertia::render('<folder>/<page>', [...])` with plain arrays, not models.
2. **List action:**
    - read `search` and each filter from the query, and validate filter values against known values
    - `$sort = SortOrder::fromRequest($request, [...allowed keys...], default: '…')`
    - `->tap($sort->apply(...))->paginate(20)->withQueryString()->through(fn ($row) => [...])`
    - return `filters` and `sort` (`$sort->toArray()`)
    - eager load what you display, and use `withCount()` for counts
3. **Routes:** use `can:<resource>.<action>` middleware on every route, never role checks. Register new permissions in `config/permissions.php`.
4. **Form Requests** for store and update: `authorize()` checks the permission, and `rules()` validates.
5. **Success:** `Inertia::flash('toast', ['type' => 'success', 'message' => __('<Thing> created successfully.')]);`, then redirect.
6. **Regenerate route helpers:** `php artisan wayfinder:generate --with-form`.

## Step 2: list page template

```tsx
import { Add01Icon } from '@hugeicons/core-free-icons';
import { Head, Link } from '@inertiajs/react';
import ThingController from '@/actions/App/Http/Controllers/ThingController';
import type {
    DataTableColumn,
    DataTableSort,
} from '@/components/data-table/data-table';
import { DataTable } from '@/components/data-table/data-table';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { useAuthorization } from '@/hooks/use-authorization';
import type { Paginator } from '@/types';

type Thing = {
    id: number;
    name: string;
    status: string;
    created_at: string | null;
};

type Props = {
    things: Paginator<Thing>;
    statuses: string[];
    filters: { search: string; status: string | null };
    sort: DataTableSort;
};

export default function ThingsIndex({
    things,
    statuses,
    filters,
    sort,
}: Props) {
    const { can } = useAuthorization();

    const columns: DataTableColumn<Thing>[] = [
        {
            id: 'name',
            header: 'Name',
            sortKey: 'name',
            className: 'font-medium',
            cell: (thing) => (
                <span className="min-w-48 inline-block">{thing.name}</span>
            ),
        },
        { id: 'status', header: 'Status', cell: (thing) => thing.status },
        {
            id: 'created',
            header: 'Created',
            sortKey: 'created_at',
            visibleFrom: 'md',
            className: 'text-muted-foreground',
            cell: (thing) =>
                thing.created_at
                    ? new Date(thing.created_at).toLocaleDateString()
                    : '—',
        },
        {
            id: 'actions',
            header: <span className="sr-only">Actions</span>,
            align: 'right',
            className: 'w-0',
            cell: (thing) =>
                null /* row actions dropdown, see users/index.tsx */,
        },
    ];

    return (
        <>
            <Head title="Things" />

            <div className="p-4 md:p-6">
                <DataTable
                    title="Things"
                    description="One sentence describing this list."
                    url={ThingController.index.url()}
                    paginator={things}
                    columns={columns}
                    rowKey={(thing) => thing.id}
                    search={{
                        value: filters.search,
                        placeholder: 'Search things',
                    }}
                    filters={[
                        {
                            key: 'status',
                            label: 'Status',
                            value: filters.status,
                            allLabel: 'All statuses',
                            options: statuses.map((status) => ({
                                value: status,
                                label: status,
                            })),
                        },
                    ]}
                    sort={sort}
                    actions={
                        can('things.create') && (
                            <Button asChild>
                                <Link href={ThingController.create.url()}>
                                    <Icon iconNode={Add01Icon} />
                                    <span className="hidden sm:inline">
                                        Create thing
                                    </span>
                                    <span className="sr-only sm:hidden">
                                        Create thing
                                    </span>
                                </Link>
                            </Button>
                        )
                    }
                    noun="things"
                    emptyMessage="There are no things yet."
                    emptyFilteredMessage="No things match your search or filters."
                />
            </div>
        </>
    );
}

ThingsIndex.layout = () => ({
    breadcrumbs: [{ title: 'Things', href: ThingController.index() }],
});
```

- **Row actions:** copy `UserActions` from `pages/admin/users/index.tsx`: a `MoreHorizontalIcon` dropdown with Edit (`Edit02Icon`) and a destructive Delete (`Delete02Icon`) that opens `ConfirmDialog`. Hide each item with `can()`.
- **Delete:** `router.delete(url, { preserveScroll: true, onSuccess: close, onError: (errors) => setError(errors.<key>) })`, with the error shown in the dialog.

## Step 3: create / edit template

- **One shared form component**, `components/<feature>/<thing>-form.tsx`, used by both `create.tsx` and `edit.tsx`.
- **Structure:** `<form onSubmit={submit} className="space-y-6 md:pb-24">`, then `FormSection` cards, then `UnsavedChangesBar` as the last child. Never add Save / Cancel buttons:

    ```tsx
    <UnsavedChangesBar
        visible={form.isDirty}
        processing={form.processing}
        saveLabel="Create thing"
        onReset={() => {
            form.reset();
            form.clearErrors();
        }}
    />
    ```

- **Dirty state:** sort array values when creating `useForm` so toggling back hides the bar. If the page stays open after saving, call `form.setDefaults()` in `onSuccess`.
- **Read-only forms:** don't render the bar.
- **Fields:** `<div className="grid content-start gap-2">` containing `Label` (`*` when required), the input, and `InputError`. Use `className="grid gap-4 md:grid-cols-2"` on `FormSection` for short fields.
- **Pages:** `<div className="p-4 md:p-6">`, the form, and breadcrumbs `[List, Create thing]` or `[List, <name>]`.
- **Don't** add back buttons or page headings above forms; the breadcrumbs show where you are.
- **Spatie models:** their Wayfinder IDs are typed as strings, so pass `String(model.id)`.

## Step 4: navigation and permissions

- **Destination pages:** add a `NavItem` with `permission` to `components/app-sidebar.tsx` (the **Workspace** or **Administration** group), and a matching entry in `hooks/use-search-items.tsx`.
- **Hiding UI:** use `useAuthorization().can()` for buttons and menu items. The server must enforce the same permission.

## Step 5: icons

- Use HugeIcons only: `import { XIcon } from '@hugeicons/core-free-icons'`, rendered as `<Icon iconNode={XIcon} />` from `@/components/ui/icon`.
- Follow the icon table in `docs/ui-guidelines.md`.
- Verify a name exists before using it: `grep -q "export declare const XIcon" node_modules/@hugeicons/core-free-icons/dist/types/index.d.ts`.

## Step 6: verify

1. Write Pest feature tests covering the page render (`assertInertia`), permission denial (403), validation, and each mutation.
2. Run `php artisan wayfinder:generate --with-form`, `npx vp check --fix`, `npx tsc --noEmit`, `vendor/bin/pint --parallel`, `vendor/bin/phpstan analyse --memory-limit=512M`, `npm run build` and `php artisan test --compact`.
3. Check the page in dark mode and at 390px width, then go through the checklist at the end of `docs/ui-guidelines.md`.

## Common mistakes

- Building a custom table or filter bar instead of `DataTable`.
- Sorting with raw `orderBy($request->sort)` instead of `SortOrder`.
- Forgetting `withQueryString()`, which drops filters when paginating.
- Hardcoded URLs instead of Wayfinder, or `lucide-react` icons.
- Hiding a button with `can()` but not protecting the route.
- A "Back" button next to breadcrumbs.
- Classic Save / Cancel buttons on a form instead of `UnsavedChangesBar`, or the bar never hiding after save on pages that stay open (missing `setDefaults()`).
