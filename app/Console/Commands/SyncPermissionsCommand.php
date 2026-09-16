<?php

namespace App\Console\Commands;

use App\Actions\Authorization\SyncPermissions;
use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;

#[Signature('permissions:sync')]
#[Description('Create missing permissions from config/permissions.php and grant all permissions to the Admin role')]
class SyncPermissionsCommand extends Command
{
    public function handle(SyncPermissions $sync): int
    {
        $result = $sync->handle();

        $this->components->info('Permissions synchronized successfully.');
        $this->components->twoColumnDetail('Created', (string) $result['created']);
        $this->components->twoColumnDetail('Existing', (string) $result['existing']);
        $this->components->twoColumnDetail('Admin permissions synchronized', (string) $result['admin_permissions']);

        return self::SUCCESS;
    }
}
