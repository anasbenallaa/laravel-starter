<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Authorization\SystemRole;
use App\Concerns\AccessValidationRules;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;
use Spatie\Permission\Models\Permission;

class UpdatePermissionRequest extends FormRequest
{
    use AccessValidationRules;

    public function authorize(): bool
    {
        return $this->user()->can('permissions.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => $this->permissionNameRules($this->permission()),
        ];
    }

    /**
     * Renaming a permission that someone holds could turn it into a permission
     * the code checks elsewhere (e.g. reports.view → settings.update), so only
     * admins may rename permissions that are in use.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                $permission = $this->permission();

                if ($this->input('name') === $permission->name
                    || app(PermissionDelegation::class)->isUnrestricted($this->user())) {
                    return;
                }

                $inUse = $permission->roles()->where('name', '!=', SystemRole::ADMIN)->exists()
                    || $permission->users()->exists();

                if ($inUse) {
                    $validator->errors()->add('name', __('Only an administrator can rename a permission that is assigned to roles or users.'));
                }
            },
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => __('Use the resource.action format with lowercase letters, numbers and underscores, e.g. reports.export.'),
            'name.unique' => __('Permission already exists.'),
        ];
    }

    public function permission(): Permission
    {
        /** @var Permission */
        return $this->route('permission');
    }
}
