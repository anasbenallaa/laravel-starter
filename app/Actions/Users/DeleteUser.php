<?php

namespace App\Actions\Users;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Deletes a user and everything that belongs only to them. Role and
 * permission assignments are detached by Spatie's HasRoles trait.
 */
class DeleteUser
{
    public function handle(User $user): void
    {
        $avatarPath = $user->avatar_path;

        DB::transaction(function () use ($user) {
            $user->notifications()->delete();
            $user->delete();
        });

        if ($avatarPath) {
            Storage::disk('s3')->delete($avatarPath);
        }
    }
}
