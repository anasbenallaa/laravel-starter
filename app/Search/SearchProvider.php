<?php

namespace App\Search;

use App\Models\User;

/**
 * A searchable resource in the global search palette. To make a new module
 * searchable, implement this and add the class to GlobalSearch::PROVIDERS.
 */
interface SearchProvider
{
    /** Stable key, e.g. "users". */
    public function key(): string;

    /** Group heading shown in the palette, e.g. "Users". */
    public function label(): string;

    /** Permission required to see this group's results. */
    public function permission(): string;

    /**
     * @return array<int, SearchResult>
     */
    public function search(User $user, string $term, int $limit): array;
}
