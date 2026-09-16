<?php

/*
|--------------------------------------------------------------------------
| Application Permissions
|--------------------------------------------------------------------------
|
| The single canonical list of permissions the application's code checks.
| Each resource maps to its actions and produces "resource.action" names,
| e.g. users.view. Permissions are only ever defined here, never from the
| UI: `php artisan permissions:sync` (also run by the seeder and on deploy)
| creates any that are missing and grants them to the Admin role. They are
| never deleted automatically when removed from this file.
|
| To add a module, add its resource here and run permissions:sync:
|
|     'orders' => ['view', 'create', 'update', 'delete', 'approve'],
|
*/

return [

    // reset_password: email a user a password reset link (admins never set passwords).
    'users' => ['view', 'create', 'update', 'delete', 'reset_password'],

    'roles' => ['view', 'create', 'update', 'delete'],

    'permissions' => ['view'],

    // Everyone sees their own activity: view.all unlocks everyone's,
    // export allows downloading the (scoped, filtered) timeline as CSV.
    'activities' => ['view.all', 'export'],

];
