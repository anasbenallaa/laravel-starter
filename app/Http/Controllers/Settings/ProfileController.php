<?php

namespace App\Http\Controllers\Settings;

use App\Actions\Users\DeleteUser;
use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ProfileDeleteRequest;
use App\Http\Requests\Settings\ProfileUpdateRequest;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    /**
     * Show the user's profile settings page.
     */
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/profile', [
            'mustVerifyEmail' => $request->user() instanceof MustVerifyEmail,
            'status' => $request->session()->get('status'),
        ]);
    }

    /**
     * Update the user's profile information.
     */
    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $request->user()->fill($request->validated());

        if ($request->user()->isDirty('email')) {
            $request->user()->email_verified_at = null;
        }

        $request->user()->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.profile_updated')]);

        return to_route('profile.edit');
    }

    /**
     * Upload or replace the user's avatar (stored on the S3 disk).
     */
    public function updateAvatar(Request $request): RedirectResponse
    {
        $request->validate([
            'avatar' => ['required', 'image', 'mimes:jpeg,jpg,png,webp', 'max:1024'],
        ]);

        $user = $request->user();

        $path = $request->file('avatar')->storePublicly('settings/profile/avatar', 's3');

        if ($user->avatar_path && $user->avatar_path !== $path) {
            Storage::disk('s3')->delete($user->avatar_path);
        }

        $user->forceFill(['avatar_path' => $path])->save();

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.avatar_updated')]);

        return to_route('profile.edit');
    }

    /**
     * Remove the user's avatar.
     */
    public function deleteAvatar(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user->avatar_path) {
            Storage::disk('s3')->delete($user->avatar_path);
            $user->forceFill(['avatar_path' => null])->save();
        }

        Inertia::flash('toast', ['type' => 'success', 'message' => __('flash.avatar_removed')]);

        return to_route('profile.edit');
    }

    /**
     * Delete the user's profile.
     */
    public function destroy(ProfileDeleteRequest $request, DeleteUser $deleteUser): RedirectResponse
    {
        $user = $request->user();

        Auth::logout();

        $deleteUser->handle($user);

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect('/');
    }
}
