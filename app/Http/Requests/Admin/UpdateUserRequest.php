<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rules\Password;

class UpdateUserRequest extends FormRequest
{
    use PasswordValidationRules, ProfileValidationRules;

    /**
     * Changing a user's email or password lets you sign in as them, so the
     * actor must also be allowed to manage this particular user.
     */
    public function authorize(): bool
    {
        return $this->user()->can('users.update')
            && app(PermissionDelegation::class)->canManageUser($this->user(), $this->targetUser());
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules($this->targetUser()->id),
            // Leave blank to keep the current password.
            'password' => ['nullable', 'string', Password::default(), 'confirmed'],
        ];
    }

    public function targetUser(): User
    {
        /** @var User */
        return $this->route('user');
    }
}
