<?php

namespace App\Http\Controllers;

use App\Activity\ActivityAction;
use App\Activity\ActivityCsv;
use App\Activity\ActivityFeed;
use App\Contracts\ActivityLoggerInterface;
use App\Models\Activity;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Read-only activity feed and CSV export. Every user sees their own activity;
 * users with activities.view.all see everyone's. There are deliberately no
 * store, update or destroy actions: activity history can't be changed.
 */
class ActivityController extends Controller
{
    public const int PER_PAGE = 20;

    public function index(Request $request): Response
    {
        $feed = ActivityFeed::fromRequest($request);
        $activities = $feed->query()->with('user:id,name,email,avatar_path');

        return Inertia::render('activities/index', [
            'activities' => Inertia::scroll(fn () => $activities
                ->cursorPaginate(self::PER_PAGE)
                ->withQueryString()
                ->through(fn (Activity $activity) => $this->present($activity))),
            'filters' => $feed->filters,
            'canViewAll' => $feed->canViewAll,
            'actions' => $this->actionOptions($feed->canViewAll ? null : $feed->viewer->id),
            'users' => $feed->canViewAll ? $this->userOptions($feed->filters['user']) : [],
        ]);
    }

    /**
     * Download the activity the viewer can see, with the current filters, as
     * CSV. Streamed in chunks so large histories don't load into memory.
     */
    public function export(Request $request, ActivityLoggerInterface $activityLogger): StreamedResponse
    {
        $feed = ActivityFeed::fromRequest($request);
        $rows = $feed->query()->count();

        // Exporting is an action like any other: record it. Logged before the
        // download starts, so the file doesn't include its own entry.
        $exportEntry = $activityLogger->log(
            action: ActivityAction::EXPORTED,
            description: "Exported {$rows} ".Str::plural('activity', $rows).' to CSV',
            metadata: ['rows' => $rows, 'filters' => $feed->activeFilters()],
        );

        return response()->streamDownload(function () use ($feed, $exportEntry) {
            $output = fopen('php://output', 'w');

            if ($output === false) {
                return;
            }

            fputcsv($output, ActivityCsv::HEADERS, escape: '');

            $feed->query()
                ->with('user:id,name,email')
                // Exclude the export entry logged above.
                ->whereKeyNot($exportEntry->id)
                ->lazyByIdDesc(500)
                ->each(function (Activity $activity) use ($output) {
                    fputcsv($output, ActivityCsv::row($activity), escape: '');
                });

            fclose($output);
        }, 'activities-'.now()->format('Y-m-d-His').'.csv', ['Content-Type' => 'text/csv; charset=UTF-8']);
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
