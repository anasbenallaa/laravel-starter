<?php

namespace App\Activity;

use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;

/**
 * The activity query shared by the timeline and the CSV export, so both show
 * exactly the same rows for the same viewer and filters.
 *
 * Scope is applied on the server: without activities.view.all a user only
 * ever gets their own activity, whatever the query string says.
 */
final readonly class ActivityFeed
{
    /**
     * @param  array{search: string, action: string|null, user: int|null, from: string|null, to: string|null}  $filters
     */
    private function __construct(
        public User $viewer,
        public bool $canViewAll,
        public array $filters,
    ) {}

    public static function fromRequest(Request $request): self
    {
        /** @var User $viewer */
        $viewer = $request->user();
        $canViewAll = $viewer->can('activities.view.all');

        $action = $request->query('action');
        $user = $request->query('user');
        $date = fn (mixed $value): ?string => is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 && strtotime($value) !== false ? $value : null;

        return new self($viewer, $canViewAll, [
            'search' => Str::limit(trim((string) $request->query('search', '')), 100, ''),
            'action' => is_string($action) && preg_match('/^[a-z_]{1,50}$/', $action) === 1 ? $action : null,
            // Only honoured for users who may see other people's activity.
            'user' => $canViewAll && is_string($user) && ctype_digit($user) ? (int) $user : null,
            'from' => $date($request->query('from')),
            'to' => $date($request->query('to')),
        ]);
    }

    /**
     * Newest first. Activities are append-only, so id follows creation time;
     * ordering by the primary key keeps cursor pages stable and fast.
     *
     * @return Builder<Activity>
     */
    public function query(): Builder
    {
        $filters = $this->filters;

        return Activity::query()
            ->when(! $this->canViewAll, fn (Builder $query) => $query->where('user_id', $this->viewer->id))
            ->when($this->canViewAll && $filters['user'], fn (Builder $query) => $query->where('user_id', $filters['user']))
            ->when($filters['action'], fn (Builder $query, string $action) => $query->where('action', $action))
            ->when($filters['from'], fn (Builder $query, string $from) => $query->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'], fn (Builder $query, string $to) => $query->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->when($filters['search'] !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->whereLike('description', "%{$filters['search']}%")
                ->orWhereLike('subject_label', "%{$filters['search']}%")
                ->when($this->canViewAll, fn (Builder $query) => $query->orWhereHas('user', fn (Builder $query) => $query
                    ->whereLike('name', "%{$filters['search']}%")
                    ->orWhereLike('email', "%{$filters['search']}%")))))
            ->orderByDesc('id');
    }

    /**
     * Only the filters that are set, e.g. for the export's activity metadata.
     *
     * @return array<string, string|int>
     */
    public function activeFilters(): array
    {
        return array_filter($this->filters, fn ($value) => $value !== null && $value !== '');
    }
}
