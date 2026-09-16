<?php

namespace App\Concerns;

use App\Authorization\PermissionRegistry;
use Closure;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

trait AccessValidationRules
{
    /**
     * Role name: readable, and unique per guard regardless of letter case, so
     * "admin" can't shadow "Admin".
     *
     * @return array<int, ValidationRule|Closure|array<mixed>|string>
     */
    protected function roleNameRules(?Role $ignore = null): array
    {
        return [
            'required',
            'string',
            'max:100',
            'regex:/^[\pL\pN][\pL\pN &._-]*$/u',
            function (string $attribute, mixed $value, Closure $fail) use ($ignore) {
                $exists = Role::query()
                    ->where('guard_name', PermissionRegistry::guard())
                    ->whereRaw('lower(name) = ?', [mb_strtolower((string) $value)])
                    ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->getKey()))
                    ->exists();

                if ($exists) {
                    $fail(__('Role already exists.'));
                }
            },
        ];
    }

    /**
     * Permission name in "resource.action" form, unique per guard.
     *
     * @return array<int, ValidationRule|array<mixed>|string>
     */
    protected function permissionNameRules(?Permission $ignore = null): array
    {
        return [
            'required',
            'string',
            'max:100',
            'regex:'.PermissionRegistry::PATTERN,
            Rule::unique('permissions', 'name')
                ->where('guard_name', PermissionRegistry::guard())
                ->ignore($ignore?->getKey()),
        ];
    }

    /**
     * A list of existing permission names for this guard.
     *
     * @return array<string, array<int, ValidationRule|array<mixed>|string>>
     */
    protected function permissionListRules(string $key = 'permissions'): array
    {
        return [
            $key => ['present', 'array'],
            "{$key}.*" => [
                'string',
                'distinct',
                Rule::exists('permissions', 'name')->where('guard_name', PermissionRegistry::guard()),
            ],
        ];
    }

    /**
     * @return array<string, string>
     */
    protected function accessValidationMessages(): array
    {
        return [
            'name.regex' => __('Use letters, numbers, spaces, dots, dashes, ampersands or underscores.'),
            'permissions.*.exists' => __('One of the selected permissions does not exist.'),
            'roles.*.exists' => __('One of the selected roles does not exist.'),
        ];
    }
}
