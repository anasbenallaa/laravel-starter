<?php

namespace App\Authorization;

use Illuminate\Support\Collection;
use Spatie\Permission\Models\Permission;

/**
 * Naming rules and helpers for "resource.action" permissions. The permission
 * list itself lives in config/permissions.php; the registry never needs to
 * know what a resource or action means.
 */
final class PermissionRegistry
{
    /**
     * Lowercase snake_case resource and action separated by a dot, with an
     * optional qualifier: users.view, reports.export, activities.view.all.
     */
    public const string PATTERN = '/^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*){1,2}$/';

    /**
     * Actions shown first, in this order, when grouping for the UI.
     *
     * @var list<string>
     */
    private const array ACTION_ORDER = ['view', 'create', 'update', 'delete'];

    /**
     * The guard every role and permission belongs to.
     */
    public static function guard(): string
    {
        /** @var string */
        return config('auth.defaults.guard', 'web');
    }

    /**
     * All permission names defined in config/permissions.php.
     *
     * @return list<string>
     */
    public static function configured(): array
    {
        /** @var array<string, list<string>> $resources */
        $resources = config('permissions', []);

        $names = [];

        foreach ($resources as $resource => $actions) {
            foreach ($actions as $action) {
                $names[] = "{$resource}.{$action}";
            }
        }

        return $names;
    }

    public static function isValidName(string $name): bool
    {
        return preg_match(self::PATTERN, $name) === 1;
    }

    /**
     * @return array{resource: string, action: string}
     */
    public static function parse(string $name): array
    {
        [$resource, $action] = array_pad(explode('.', $name, 2), 2, '');

        return ['resource' => $resource, 'action' => $action];
    }

    /**
     * Group permissions by resource for the UI, derived purely from names.
     *
     * @param  iterable<Permission>  $permissions
     * @return array<int, array{resource: string, permissions: array<int, array{id: int, name: string, action: string}>}>
     */
    public static function group(iterable $permissions): array
    {
        return Collection::make($permissions)
            ->map(fn (Permission $permission) => [
                'id' => (int) $permission->getKey(),
                'name' => (string) $permission->name,
                ...self::parse((string) $permission->name),
            ])
            ->groupBy('resource')
            ->sortKeys()
            ->map(fn (Collection $items, string $resource) => [
                'resource' => $resource,
                'permissions' => $items
                    ->sortBy(fn (array $item) => [self::actionRank($item['action']), $item['action']])
                    ->map(fn (array $item) => ['id' => $item['id'], 'name' => $item['name'], 'action' => $item['action']])
                    ->values()
                    ->all(),
            ])
            ->values()
            ->all();
    }

    private static function actionRank(string $action): int
    {
        $index = array_search($action, self::ACTION_ORDER, true);

        return $index === false ? count(self::ACTION_ORDER) : $index;
    }
}
