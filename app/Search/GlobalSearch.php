<?php

namespace App\Search;

use App\Models\User;
use App\Search\Providers\PermissionSearchProvider;
use App\Search\Providers\RoleSearchProvider;
use App\Search\Providers\UserSearchProvider;
use Illuminate\Contracts\Container\Container;

/**
 * Runs every search provider the user is allowed to see and returns at most
 * LIMIT results per group, so the palette stays short.
 */
class GlobalSearch
{
    public const int LIMIT = 5;

    public const int MIN_LENGTH = 2;

    /**
     * Searchable resources, in display order.
     *
     * @var list<class-string<SearchProvider>>
     */
    public const array PROVIDERS = [
        UserSearchProvider::class,
        RoleSearchProvider::class,
        PermissionSearchProvider::class,
    ];

    public function __construct(private Container $container) {}

    /**
     * @return list<SearchProvider>
     */
    public function providers(): array
    {
        return array_map(
            fn (string $provider): SearchProvider => $this->container->make($provider),
            self::PROVIDERS,
        );
    }

    /**
     * Permissions that unlock at least one group.
     *
     * @return list<string>
     */
    public function permissions(): array
    {
        return array_map(fn (SearchProvider $provider) => $provider->permission(), $this->providers());
    }

    /**
     * @return list<array{key: string, label: string, results: list<array{id: string, title: string, description: string, href: string, icon: string}>}>
     */
    public function search(User $user, string $term): array
    {
        $term = trim($term);

        if (mb_strlen($term) < self::MIN_LENGTH) {
            return [];
        }

        $groups = [];

        foreach ($this->providers() as $provider) {
            if (! $user->can($provider->permission())) {
                continue;
            }

            $results = $provider->search($user, $term, self::LIMIT);

            if ($results === []) {
                continue;
            }

            $groups[] = [
                'key' => $provider->key(),
                'label' => $provider->label(),
                'results' => array_map(fn (SearchResult $result) => $result->toArray(), array_slice($results, 0, self::LIMIT)),
            ];
        }

        return $groups;
    }
}
