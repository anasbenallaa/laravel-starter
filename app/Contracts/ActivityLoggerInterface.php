<?php

namespace App\Contracts;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

/**
 * The single way activities are written.
 *
 * - Standard create/update/delete of an Auditable model is logged by
 *   ActivityObserver; don't log those again manually.
 * - Use this directly for actions observers can't see: login/logout, role
 *   and permission (pivot) changes, exports, syncs, integrations, and bulk
 *   updates/deletes (query-builder updates don't fire model events).
 */
interface ActivityLoggerInterface
{
    /**
     * @param  string  $action  Free-form, lowercase, e.g. "created", "connected", "exported".
     * @param  string|null  $description  Plain text; defaults to "<Action> <subject type> <label>".
     * @param  array<string, mixed>  $metadata  Extra context. Never put secrets here.
     * @param  array<string, mixed>|null  $oldValues  Already filtered values before the change.
     * @param  array<string, mixed>|null  $newValues  Already filtered values after the change.
     * @param  User|null  $actor  Defaults to the authenticated user; null means "System".
     */
    public function log(
        string $action,
        ?string $description = null,
        ?Model $subject = null,
        array $metadata = [],
        ?array $oldValues = null,
        ?array $newValues = null,
        ?User $actor = null,
    ): Activity;
}
