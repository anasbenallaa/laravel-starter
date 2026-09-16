<?php

namespace App\Search\Providers;

use App\Models\User;
use App\Search\SearchProvider;
use App\Search\SearchResult;

class UserSearchProvider implements SearchProvider
{
    public function key(): string
    {
        return 'users';
    }

    public function label(): string
    {
        return 'Users';
    }

    public function permission(): string
    {
        return 'users.view';
    }

    public function search(User $user, string $term, int $limit): array
    {
        return User::query()
            ->where(fn ($query) => $query
                ->whereLike('name', "%{$term}%")
                ->orWhereLike('email', "%{$term}%"))
            ->orderBy('name')
            ->limit($limit)
            ->get(['id', 'name', 'email'])
            ->map(fn (User $match) => new SearchResult(
                id: "user-{$match->id}",
                title: $match->name,
                description: $match->email,
                href: route('admin.users.index', ['search' => $match->email], absolute: false),
                icon: 'user',
            ))
            ->values()
            ->all();
    }
}
