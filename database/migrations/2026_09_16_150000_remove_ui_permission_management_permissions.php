<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;

return new class extends Migration
{
    /**
     * Permissions are now defined only in code, so the abilities for creating,
     * renaming and deleting them from the UI no longer exist.
     *
     * @var list<string>
     */
    private array $names = ['permissions.create', 'permissions.update', 'permissions.delete'];

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Pivot rows are removed by the tables' cascading foreign keys.
        DB::table('permissions')->whereIn('name', $this->names)->delete();

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Not recreated: they would grant access to features that were removed.
    }
};
