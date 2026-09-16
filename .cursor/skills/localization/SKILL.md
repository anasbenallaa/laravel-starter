---
name: localization
description: 'Translations (English, French, Arabic) and right-to-left layout. Load this whenever adding or changing user-visible text anywhere (pages, components, dialogs, toasts, validation or flash messages, emails, notifications, activity labels, permission labels, placeholders, aria-labels, page titles), formatting dates or numbers, writing layout classes or directional icons, or adding a language. Triggers on: text, label, message, translate, translation, i18n, language, locale, French, Arabic, RTL, direction, date format, plural.'
license: MIT
metadata:
    author: project
---

# Localization and RTL

The application ships in **English (`en`, default/fallback), French (`fr`) and
Arabic (`ar`, right-to-left)**. `lang/{locale}.json` is the only translation
source, shared by Laravel (`__()`) and React (i18next `t()`). Read
`docs/localization.md` for the full reference.

## Rules

1. **No hardcoded text.** Every visible string, placeholder, `aria-label`,
   `title`, `<Head title>`, toast, dialog text, empty state and error is a key.
2. **Every key in every file:** add it to `lang/en.json`, `lang/fr.json` and
   `lang/ar.json` (sorted, 4-space JSON). Keys are dotted and semantic:
   `orders.index.title`, `flash.order_created`, `errors.orders.locked`.
3. **Placeholders:** React keys use `{{name}}` (`{{count, number}}` for
   formatted numbers); PHP keys use `:name`. Keep the same names in all files.
4. **Plurals (React):** `t('orders.count', { count })` with forms
   en `_one`/`_other`, fr `_one`/`_many`/`_other`, ar `_zero`/`_one`/`_two`/`_few`/`_many`/`_other`.
   PHP: `trans_choice('key', $n)` with `{0}|{1}|[2,*]` ranges.
5. **Don't translate data or identifiers:** user/role names, emails, stored
   descriptions, permission names, action values, enum values. Show a
   translated label next to identifiers (`permissionLabel(name, t)`,
   `actionPresentation(action, t).label`, `t(\`orders.status.${status}\`)`).
6. **Dates and numbers:** `const { relativeTime, dateTime, date, number } = useFormatters();`
   Never `toLocaleString()` or manual formatting.
7. **RTL layout:** logical classes only: `ms-/me-`, `ps-/pe-`, `start-/end-`,
   `text-start/text-end`, `border-s/border-e`, `rounded-s/rounded-e`, `gap`
   instead of `space-x`; `DataTable` `align: 'end'`. Forward/back arrows and
   chevrons: `className="rtl:rotate-180"`. Technical values (emails, IPs, URLs,
   codes, identifiers): `<Ltr>{value}</Ltr>`; email inputs `dir="ltr"`.
8. **Direction logic:** `useLocale().isRtl` (from `direction === 'rtl'`),
   never `locale === 'ar'`.

## Patterns

```tsx
const { t } = useTranslation();

<Head title={t('orders.index.title')} />
<DataTable
    title={t('orders.index.title')}
    search={{ value: filters.search, placeholder: t('orders.index.search') }}
    countLabel={(count) => t('orders.count', { count })}
    emptyMessage={t('orders.index.empty')}
/>

Orders.layout = (props: Props) => ({
    breadcrumbs: [
        { title: 'orders.index.title', href: OrderController.index() }, // key
        { title: props.order.number, href: OrderController.show(props.order.id), literal: true }, // data
    ],
});

// Auth pages: Page.layout = { title: 'auth.x.title', description: 'auth.x.description' } (keys).
```

```php
Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.order_created')]);
throw ValidationException::withMessages(['order' => __('errors.orders.locked', ['number' => $order->number])]);

// Notifications render in the reader's language:
new NotificationData(
    event: 'order.shipped',
    titleKey: 'notifications.orders.shipped.title',
    messageKey: 'notifications.orders.shipped.message', // "Order {{number}} has shipped."
    parameters: ['number' => $order->number],
);
```

New permission → `permissions.label.<name>` + `permissions.resource.<resource>`.
New activity action → `activities.action.<action>` (+ `activities.sentence.<action>` for a timeline sentence).

## Verify

```bash
php artisan test --filter='TranslationFilesTest|LocaleTest'
npx tsc --noEmit && npx vp check --fix
```

Then check the page in the browser in English, French and Arabic (sidebar on
the right, arrows flipped, no clipped or overlapping text), in light and dark
mode, at 390px.

## Adding a language

`config/locales.php` (with `direction` and `plural_forms`) → `lang/{code}.json`
with every key → `Locale` type in `resources/js/types/localization.ts` →
`language.name.{code}` in every file → tests. No component changes.

## Common mistakes

- Adding a key only to `en.json`, or copying English text into `fr.json`/`ar.json`.
- `{{name}}` in a key used with `__()` (or `:name` with `t()`).
- Translating a permission name, enum value or a user's name.
- `ml-2`, `left-0`, `text-left`, `border-r`, or a chevron that points the wrong way in Arabic.
- Checking `locale === 'ar'` instead of the direction.
- Formatting dates with `new Date().toLocaleDateString()`.
