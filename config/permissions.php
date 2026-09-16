<?php

/*
|--------------------------------------------------------------------------
| Application Permissions
|--------------------------------------------------------------------------
|
| The single canonical list of permissions the application's code checks.
| Each resource maps to its actions and produces "resource.action" names,
| e.g. users.view. `php artisan permissions:sync` (and the seeder) creates
| any that are missing and grants them to the Admin role. Permissions are
| never deleted automatically when removed from this file.
|
| To add a module, add its resource here and run permissions:sync:
|
|     'orders' => ['view', 'create', 'update', 'delete', 'approve'],
|
*/

return [

    'users' => ['view', 'create', 'update', 'delete'],

    'roles' => ['view', 'create', 'update', 'delete'],

    'permissions' => ['view', 'create', 'update', 'delete'],

];
