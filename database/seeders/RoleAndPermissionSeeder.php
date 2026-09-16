<?php

namespace Database\Seeders;

use App\Actions\Authorization\SyncPermissions;
use Illuminate\Database\Seeder;

class RoleAndPermissionSeeder extends Seeder
{
    /**
     * Seed the Admin role and the permissions from config/permissions.php.
     */
    public function run(SyncPermissions $sync): void
    {
        $sync->handle();
    }
}
