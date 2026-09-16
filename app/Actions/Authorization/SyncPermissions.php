<?php

namespace App\Actions\Authorization;

use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

/**
 * Creates configured permissions that are missing, ensures the Admin role
 * exists and grants it every permission. Idempotent, and never deletes
 * permissions that are no longer in the config.
 */
class SyncPermissions
{
    public function __construct(private PermissionRegistrar $registrar) {}

    /**
     * @return array{created: int, existing: int, admin_permissions: int}
     */
    public function handle(): array
    {
        $this->registrar->forgetCachedPermissions();

        $guard = PermissionRegistry::guard();

        $result = DB::transaction(function () use ($guard) {
            $created = 0;
            $existing = 0;

            foreach (PermissionRegistry::configured() as $name) {
                $permission = Permission::query()->firstOrCreate(['name' => $name, 'guard_name' => $guard]);

                $permission->wasRecentlyCreated ? $created++ : $existing++;
            }

            $admin = Role::query()->firstOrCreate(['name' => SystemRole::ADMIN, 'guard_name' => $guard]);

            $permissions = Permission::query()->where('guard_name', $guard)->get();
            $admin->syncPermissions($permissions);

            return ['created' => $created, 'existing' => $existing, 'admin_permissions' => $permissions->count()];
        });

        $this->registrar->forgetCachedPermissions();

        return $result;
    }
}
