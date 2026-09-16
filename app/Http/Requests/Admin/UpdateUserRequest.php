<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Concerns\ProfileValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;

class UpdateUserRequest extends FormRequest
{
    use ProfileValidationRules;

    /**
     * Changing a user's email lets you take over their account (via password
     * reset), so the actor must also be allowed to manage this particular user.
     * Passwords are never set here; see UserController::sendPasswordReset().
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
        ];
    }

    public function targetUser(): User
    {
        /** @var User */
        return $this->route('user');
    }
}
