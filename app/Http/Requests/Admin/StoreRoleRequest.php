<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Concerns\AccessValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreRoleRequest extends FormRequest
{
    use AccessValidationRules;

    public function authorize(): bool
    {
        return $this->user()->can('roles.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => $this->roleNameRules(),
            ...$this->permissionListRules(),
        ];
    }

    /**
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $undelegable = app(PermissionDelegation::class)
                    ->undelegable($this->user(), (array) $this->input('permissions', []));

                if ($undelegable !== []) {
                    $validator->errors()->add('permissions', __('You cannot grant permissions you do not have: :permissions.', [
                        'permissions' => implode(', ', $undelegable),
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
