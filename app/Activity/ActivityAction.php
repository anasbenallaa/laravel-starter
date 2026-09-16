<?php

namespace App\Activity;

/**
 * Common actions. The database column is a free string, so modules may log any
 * other action (connected, synced, exported, approved...) without changing this.
 */
final class ActivityAction
{
    public const string CREATED = 'created';

    public const string UPDATED = 'updated';

    public const string DELETED = 'deleted';

    public const string TRASHED = 'trashed';

    public const string RESTORED = 'restored';

    public const string FORCE_DELETED = 'force_deleted';

    public const string LOGIN = 'login';

    public const string LOGOUT = 'logout';

    public const string ASSIGNED = 'assigned';

    public const string UNASSIGNED = 'unassigned';

    public const string GRANTED = 'granted';

    public const string REVOKED = 'revoked';

    public const string SYNCED = 'synced';
}
