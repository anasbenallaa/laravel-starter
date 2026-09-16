<?php

namespace App\Http\Requests\Admin;

use App\Authorization\PermissionDelegation;
use App\Authorization\PermissionRegistry;
use App\Authorization\SystemRole;
use App\Concerns\AccessValidationRules;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Collection;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;
use Spatie\Permission\Models\Role;

class UpdateUserAccessRequest extends FormRequest
{
    use AccessValidationRules;

    public function authorize(): bool
    {
        return $this->user()->can('users.update');
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'roles' => ['present', 'array'],
            'roles.*' => [
                'string',
                'distinct',
                Rule::exists('roles', 'name')->where('guard_name', PermissionRegistry::guard()),
            ],
            ...$this->permissionListRules(),
        ];
    }

    /**
     * Only the roles and direct permissions that actually change are checked
     * against the actor's delegation rights, so a limited manager can still
     * save a user who holds access beyond their own.
     *
     * @return array<int, callable(Validator): void>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $target = $this->targetUser();
                $actor = $this->user();
                $delegation = app(PermissionDelegation::class);

                $currentRoles = $target->getRoleNames();
                $requestedRoles = Collection::make((array) $this->input('roles', []));
                $changedRoles = $requestedRoles->diff($currentRoles)->merge($currentRoles->diff($requestedRoles))->unique();

                $unmanageable = Role::query()
                    ->with('permissions:id,name')
                    ->where('guard_name', PermissionRegistry::guard())
                    ->whereIn('name', $changedRoles)
                    ->get()
                    ->reject(fn (Role $role) => $delegation->canManageRole($actor, $role))
                    ->pluck('name');

                if ($unmanageable->isNotEmpty()) {
                    $validator->errors()->add('roles', $unmanageable->contains(SystemRole::ADMIN)
                        ? __('Only an administrator can assign or remove the Admin role.')
                        : __('You cannot assign or remove roles with permissions you do not have: :roles.', [
                            'roles' => $unmanageable->implode(', '),
                        ]));
                }

                if (! $requestedRoles->contains(SystemRole::ADMIN) && SystemRole::isLastAdmin($target)) {
                    $validator->errors()->add('roles', __('The last administrator cannot lose the Admin role.'));
                }

                $currentPermissions = $target->getDirectPermissions()->pluck('name');
                $requestedPermissions = Collection::make((array) $this->input('permissions', []));
                $changedPermissions = $requestedPermissions->diff($currentPermissions)
                    ->merge($currentPermissions->diff($requestedPermissions));

                $undelegable = $delegation->undelegable($actor, $changedPermissions->all());

                if ($undelegable !== []) {
                    $validator->errors()->add('permissions', __('You cannot grant or revoke permissions you do not have: :permissions.', [
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

    public function targetUser(): User
    {
        /** @var User */
        return $this->route('user');
    }
}
