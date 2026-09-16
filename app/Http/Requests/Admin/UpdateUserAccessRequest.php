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

                $unmanageable = $delegation->unmanageableRoles($actor, $changedRoles->all());

                if ($unmanageable->isNotEmpty()) {
                    $validator->errors()->add('roles', $unmanageable->contains(SystemRole::ADMIN)
                        ? __('errors.access.admin_role_only')
                        : __('errors.access.roles_not_owned', [
                            'roles' => $unmanageable->implode(', '),
                        ]));
                }

                if (! $requestedRoles->contains(SystemRole::ADMIN) && SystemRole::isLastAdmin($target)) {
                    $validator->errors()->add('roles', __('errors.access.last_admin_role'));
                }

                $currentPermissions = $target->getDirectPermissions()->pluck('name');
                $requestedPermissions = Collection::make((array) $this->input('permissions', []));
                $changedPermissions = $requestedPermissions->diff($currentPermissions)
                    ->merge($currentPermissions->diff($requestedPermissions));

                $undelegable = $delegation->undelegable($actor, $changedPermissions->all());

                if ($undelegable !== []) {
                    $validator->errors()->add('permissions', __('errors.access.permissions_not_owned', [
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
