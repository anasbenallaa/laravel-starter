<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Authorization\PermissionRegistry;
use App\Concerns\AccessValidationRules;
use App\Concerns\PasswordValidationRules;
use App\Concerns\ProfileValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreUserRequest extends FormRequest
{
    use AccessValidationRules, PasswordValidationRules, ProfileValidationRules;

    public function authorize(): bool
    {
        return $this->user()->can('users.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            ...$this->profileRules(),
            'password' => $this->passwordRules(),
            'roles' => ['present', 'array'],
            'roles.*' => [
                'string',
                'distinct',
                Rule::exists('roles', 'name')->where('guard_name', PermissionRegistry::guard()),
            ],
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->has('roles.*')) {
                    return;
                }

                $unmanageable = app(PermissionDelegation::class)
                    ->unmanageableRoles($this->user(), (array) $this->input('roles', []));

                if ($unmanageable->isNotEmpty()) {
                    $validator->errors()->add('roles', __('You cannot assign roles with permissions you do not have: :roles.', [
                        'roles' => $unmanageable->implode(', '),
                    ]));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return $this->accessValidationMessages();
    }
}
