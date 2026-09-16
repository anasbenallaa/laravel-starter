<?php

namespace App\Search;

/**
 * One row in the global search palette.
 */
final readonly class SearchResult
{
    /**
     * @param  string  $icon  Frontend icon name (see resources/js/hooks/use-remote-search.ts).
     */
    public function __construct(
        public string $id,
        public string $title,
        public string $description,
        public string $href,
        public string $icon,
    ) {}

    /**
     * @return array{id: string, title: string, description: string, href: string, icon: string}
     */
    public function toArray(): array
    {
        return [
            'id' => $this->id,
            'title' => $this->title,
            'description' => $this->description,
            'href' => $this->href,
            'icon' => $this->icon,
        ];
    }
}
