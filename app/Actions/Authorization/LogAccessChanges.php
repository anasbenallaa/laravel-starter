<?php

namespace App\Actions\Authorization;

use App\Activity\ActivityAction;
use App\Contracts\ActivityLoggerInterface;
use App\Models\User;
use Spatie\Permission\Models\Role;

/**
 * Role and permission assignments live in Spatie's pivot tables, which don't
 * fire model events, so they are logged explicitly here: one activity per
 * role or permission that changed.
 */
class LogAccessChanges
{
    public function __construct(private ActivityLoggerInterface $logger) {}

    /**
     * @param  array<int, string>  $before
     * @param  array<int, string>  $after
     */
    public function userRoles(User $user, array $before, array $after): void
    {
        foreach (array_values(array_diff($after, $before)) as $role) {
            $this->logger->log(
                action: ActivityAction::ASSIGNED,
                description: "Assigned role {$role} to {$user->name}",
                subject: $user,
                metadata: ['role' => $role],
            );
        }

        foreach (array_values(array_diff($before, $after)) as $role) {
            $this->logger->log(
                action: ActivityAction::UNASSIGNED,
                description: "Removed role {$role} from {$user->name}",
                subject: $user,
                metadata: ['role' => $role],
            );
        }
    }

    /**
     * @param  array<int, string>  $before
     * @param  array<int, string>  $after
     */
    public function userPermissions(User $user, array $before, array $after): void
    {
        foreach (array_values(array_diff($after, $before)) as $permission) {
            $this->logger->log(
                action: ActivityAction::GRANTED,
                description: "Granted {$permission} to {$user->name}",
                subject: $user,
                metadata: ['permission' => $permission],
            );
        }

        foreach (array_values(array_diff($before, $after)) as $permission) {
            $this->logger->log(
                action: ActivityAction::REVOKED,
                description: "Revoked {$permission} from {$user->name}",
                subject: $user,
                metadata: ['permission' => $permission],
            );
        }
    }

    public function roleCreated(Role $role): void
    {
        $this->logger->log(
            action: ActivityAction::CREATED,
            subject: $role,
            newValues: [
                'name' => $role->name,
                'permissions' => $role->permissions()->pluck('name')->sort()->values()->all(),
            ],
        );
    }

    /**
     * @param  array<int, string>  $permissionsBefore
     */
    public function roleUpdated(Role $role, string $nameBefore, array $permissionsBefore): void
    {
        $permissionsAfter = $role->permissions()->pluck('name')->sort()->values()->all();
        sort($permissionsBefore);

        $old = [];
        $new = [];

        if ($nameBefore !== $role->name) {
            $old['name'] = $nameBefore;
            $new['name'] = $role->name;
        }

        if ($permissionsBefore !== $permissionsAfter) {
            $old['permissions'] = $permissionsBefore;
            $new['permissions'] = $permissionsAfter;
        }

        if ($new === []) {
            return;
        }

        $this->logger->log(
            action: ActivityAction::UPDATED,
            subject: $role,
            metadata: array_filter([
                'permissions_added' => array_values(array_diff($permissionsAfter, $permissionsBefore)),
                'permissions_removed' => array_values(array_diff($permissionsBefore, $permissionsAfter)),
            ]),
            oldValues: $old,
            newValues: $new,
        );
    }

    public function roleDeleted(Role $role, int $usersCount): void
    {
        $this->logger->log(
            action: ActivityAction::DELETED,
            subject: $role,
            oldValues: [
                'name' => $role->name,
                'permissions' => $role->permissions()->pluck('name')->sort()->values()->all(),
                'users' => $usersCount,
            ],
        );
    }
}
