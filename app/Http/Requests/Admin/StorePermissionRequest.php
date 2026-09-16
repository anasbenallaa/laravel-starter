<?php

namespace App\Http\Requests\Admin;

use App\Concerns\AccessValidationRules;
use Illuminate\Foundation\Http\FormRequest;

class StorePermissionRequest extends FormRequest
{
    use AccessValidationRules;

    public function authorize(): bool
    {
        return $this->user()->can('permissions.create');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'name' => $this->permissionNameRules(),
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
}
