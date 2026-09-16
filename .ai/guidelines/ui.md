## Activity log

- Models users create/change/delete must `use Auditable` (see `docs/activity-log.md`); log pivot, bulk and custom actions (connect, export, sync…) with `ActivityLoggerInterface`, never duplicating observer CRUD. Activities are read-only: never add routes or code that edit or delete them.
