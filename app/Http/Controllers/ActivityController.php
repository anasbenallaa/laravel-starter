<?php

namespace App\Http\Controllers;

use App\Activity\ActivityAction;
use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Read-only activity feed. Every user sees their own activity; users with
 * activities.view.all see everyone's. There are deliberately no store,
 * update or destroy actions: activity history can't be changed.
 */
class ActivityController extends Controller
{
    public const int PER_PAGE = 20;

    public function index(Request $request): Response
    {
        $viewer = $request->user();
        $canViewAll = $viewer->can('activities.view.all');
        $filters = $this->filters($request, $canViewAll);

        $activities = Activity::query()
            ->with('user:id,name,email,avatar_path')
            // Scope first, on the server: a regular user's ?user= is ignored.
            ->when(! $canViewAll, fn (Builder $query) => $query->where('user_id', $viewer->id))
            ->when($canViewAll && $filters['user'], fn (Builder $query) => $query->where('user_id', $filters['user']))
            ->when($filters['action'], fn (Builder $query, string $action) => $query->where('action', $action))
            ->when($filters['from'], fn (Builder $query, string $from) => $query->where('created_at', '>=', Carbon::parse($from)->startOfDay()))
            ->when($filters['to'], fn (Builder $query, string $to) => $query->where('created_at', '<=', Carbon::parse($to)->endOfDay()))
            ->when($filters['search'] !== '', fn (Builder $query) => $query->where(fn (Builder $query) => $query
                ->whereLike('description', "%{$filters['search']}%")
                ->orWhereLike('subject_label', "%{$filters['search']}%")
                ->when($canViewAll, fn (Builder $query) => $query->orWhereHas('user', fn (Builder $query) => $query
                    ->whereLike('name', "%{$filters['search']}%")
                    ->orWhereLike('email', "%{$filters['search']}%")))))
            // Newest first. Activities are append-only, so id follows creation
            // time; ordering by the primary key keeps cursor pages stable and fast.
            ->orderByDesc('id');

        return Inertia::render('activities/index', [
            'activities' => Inertia::scroll(fn () => $activities
                ->cursorPaginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Activity $activity) => $this->present($activity))),
            'filters' => $filters,
            'canViewAll' => $canViewAll,
            'actions' => $this->actionOptions($canViewAll ? null : $viewer->id),
            'users' => $canViewAll ? $this->userOptions($filters['user']) : [],
        ]);
    }

    /**
     * @return array{search: string, action: string|null, user: int|null, from: string|null, to: string|null}
     */
    private function filters(Request $request, bool $canViewAll): array
    {
        $action = $request->query('action');
        $user = $request->query('user');
        $date = fn (mixed $value): ?string => is_string($value) && preg_match('/^\d{4}-\d{2}-\d{2}$/', $value) === 1 && strtotime($value) !== false ? $value : null;

        return [
            'search' => Str::limit(trim((string) $request->query('search', '')), 100, ''),
            'action' => is_string($action) && preg_match('/^[a-z_]{1,50}$/', $action) === 1 ? $action : null,
            // Only honoured for users who may see other people's activity.
            'user' => $canViewAll && is_string($user) && ctype_digit($user) ? (int) $user : null,
            'from' => $date($request->query('from')),
            'to' => $date($request->query('to')),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function present(Activity $activity): array
    {
        $oldValues = $activity->old_values ?? [];
        $newValues = $activity->new_values ?? [];
        $isChange = $activity->old_values !== null && $activity->new_values !== null;

        return [
            'id' => $activity->id,
            'action' => $activity->action,
            'description' => $activity->description,
            'subject_type' => $activity->subject_type
                ? Str::headline(class_basename(Relation::getMorphedModel($activity->subject_type) ?? $activity->subject_type))
                : null,
            'subject_id' => $activity->subject_id,
            'subject_label' => $activity->subject_label,
            // Updates: field-by-field before → after.
            'changes' => $isChange
                ? collect($activity->changed_fields ?? array_keys($newValues))
                    ->map(fn (string $field) => [
                        'field' => $field,
                        'old' => $oldValues[$field] ?? null,
                        'new' => $newValues[$field] ?? null,
                    ])
                    ->values()
                    ->all()
                : [],
            // Created/deleted: a snapshot of the safe values.
            'values' => $isChange
                ? []
                : collect($newValues ?: $oldValues)
                    ->map(fn (mixed $value, string $field) => ['field' => $field, 'value' => $value])
                    ->values()
                    ->all(),
            'metadata' => $activity->metadata ?? [],
            'user_id' => $activity->user_id,
            'user' => $activity->user ? [
                'id' => $activity->user->id,
                'name' => $activity->user->name,
                'email' => $activity->user->email,
                'avatar' => $activity->user->avatar,
            ] : null,
            'created_at' => $activity->created_at->toIso8601String(),
        ];
    }

    /**
     * Common actions plus any custom ones already recorded (for the filter).
     *
     * @return array<int, mixed>
     */
    private function actionOptions(?int $userId): array
    {
        $recorded = Activity::query()
            ->when($userId, fn (Builder $query) => $query->where('user_id', $userId))
            ->distinct()
            ->limit(100)
            ->pluck('action')
            ->all();

        return collect([ActivityAction::CREATED, ActivityAction::UPDATED, ActivityAction::DELETED, ActivityAction::RESTORED])
            ->merge($recorded)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * @return array<int, array{id: int, name: string, email: string}>
     */
    private function userOptions(?int $selected): array
    {
        return User::query()
            ->orderBy('name')
            ->limit(500)
            ->get(['id', 'name', 'email'])
            ->when($selected, fn ($users) => $users->contains('id', $selected)
                ? $users
                : $users->push(...User::query()->whereKey($selected)->get(['id', 'name', 'email'])))
            ->map(fn (User $user) => ['id' => $user->id, 'name' => $user->name, 'email' => $user->email])
            ->values()
            ->all();
    }
}
