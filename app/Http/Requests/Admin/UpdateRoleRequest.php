<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Authorization\SystemRole;
use App\Concerns\AccessValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Spatie\Permission\Models\Role;

class UpdateRoleRequest extends FormRequest
{
    use AccessValidationRules;

    public function authorize(): bool
    {
        return $this->user()->can('roles.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => $this->roleNameRules($this->role()),
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
                $role = $this->role();

                if (SystemRole::isSystem($role)) {
                    $validator->errors()->add('role', __('The Admin role is a system role and cannot be modified.'));

                    return;
                }

                $delegation = app(PermissionDelegation::class);

                if (! $delegation->canManageRole($this->user(), $role)) {
                    $validator->errors()->add('role', __('You can only edit roles whose permissions you have.'));

                    return;
                }

                $undelegable = $delegation->undelegable($this->user(), (array) $this->input('permissions', []));

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

    public function role(): Role
    {
        /** @var Role */
        return $this->route('role');
    }
}
