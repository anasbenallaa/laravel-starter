<?php

namespace App\Support;

use Closure;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

/**
 * Server-side sorting for list pages, driven by ?sort=column&direction=asc|desc.
 *
 * Only keys listed in $sortable can be sorted on, so user input never reaches
 * the query as a column name. Each key maps to a column, or to a closure for
 * sorts that need more than orderBy (e.g. a relation count):
 *
 *     $sort = SortOrder::fromRequest($request, [
 *         'name' => 'name',
 *         'created_at' => 'created_at',
 *         'roles' => fn (Builder $query, string $direction) => $query->orderBy('roles_count', $direction),
 *     ], default: 'name');
 *
 *     User::query()->tap($sort->apply(...))->paginate();
 */
final readonly class SortOrder
{
    public const string ASC = 'asc';

    public const string DESC = 'desc';

    /**
     * @param  'asc'|'desc'  $direction
     * @param  array<string, string|Closure(Builder<covariant Model>, 'asc'|'desc'): mixed>  $sortable
     */
    private function __construct(
        public string $column,
        public string $direction,
        private array $sortable,
    ) {}

    /**
     * @param  array<string, string|Closure(Builder<covariant Model>, 'asc'|'desc'): mixed>  $sortable
     */
    public static function fromRequest(
        Request $request,
        array $sortable,
        string $default,
        string $defaultDirection = self::ASC,
    ): self {
        $requested = $request->query('sort');
        $column = is_string($requested) && array_key_exists($requested, $sortable) ? $requested : $default;

        $requestedDirection = $request->query('direction');
        $direction = match (true) {
            $requestedDirection === self::DESC => self::DESC,
            $requestedDirection === self::ASC => self::ASC,
            $column === $default && $defaultDirection === self::DESC => self::DESC,
            default => self::ASC,
        };

        return new self($column, $direction, $sortable);
    }

    /**
     * Order the query, then by primary key so rows with equal values keep a
     * stable position across pages.
     *
     * @template TModel of Model
     *
     * @param  Builder<TModel>  $query
     * @return Builder<TModel>
     */
    public function apply(Builder $query): Builder
    {
        $sort = $this->sortable[$this->column];

        if ($sort instanceof Closure) {
            $sort($query, $this->direction);
        } else {
            $query->orderBy($sort, $this->direction);
        }

        return $query->orderBy($query->getModel()->getQualifiedKeyName(), $this->direction);
    }

    /**
     * The effective sort, for the frontend to show the active column.
     *
     * @return array{column: string, direction: 'asc'|'desc'}
     */
    public function toArray(): array
    {
        return ['column' => $this->column, 'direction' => $this->direction];
    }
}
