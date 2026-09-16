<?php

namespace Database\Seeders;

use App\Authorization\SystemRole;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RoleAndPermissionSeeder::class);

        // User::factory(10)->create();

        // Local development user; firstOrCreate keeps db:seed re-runnable.
        $user = User::query()->where('email', 'test@example.com')->first()
            ?? User::factory()->create(['name' => 'Test User', 'email' => 'test@example.com']);

        $user->assignRole(SystemRole::ADMIN);
    }
}
