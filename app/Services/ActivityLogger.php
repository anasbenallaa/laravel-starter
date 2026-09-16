<?php

namespace App\Services;

use App\Contracts\ActivityLoggerInterface;
use App\Models\Activity;
use App\Models\User;
use Illuminate\Contracts\Foundation\Application;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class ActivityLogger implements ActivityLoggerInterface
{
    public function __construct(private Application $app) {}

    public function log(
        string $action,
        ?string $description = null,
        ?Model $subject = null,
        array $metadata = [],
        ?array $oldValues = null,
        ?array $newValues = null,
        ?User $actor = null,
    ): Activity {
        // Activity itself is never audited, so this can't recurse.
        if ($subject instanceof Activity) {
            $subject = null;
        }

        $actor ??= Auth::user() instanceof User ? Auth::user() : null;
        [$ipAddress, $userAgent] = $this->requestContext();
        $label = $subject ? $this->subjectLabel($subject) : null;

        return Activity::query()->create([
            'user_id' => $actor?->getKey(),
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'subject_label' => $label !== null ? Str::limit($label, 250, '…') : null,
            'description' => Str::limit($description ?? $this->describe($action, $subject, $label), 490, '…'),
            'old_values' => $oldValues ?: null,
            'new_values' => $newValues ?: null,
            'changed_fields' => $oldValues !== null && $newValues !== null
                ? array_values(array_unique([...array_keys($oldValues), ...array_keys($newValues)]))
                : null,
            'metadata' => $metadata ?: null,
            'ip_address' => $ipAddress,
            'user_agent' => $userAgent,
        ]);
    }

    private function subjectLabel(Model $subject): string
    {
        if (method_exists($subject, 'activityLabel')) {
            return (string) $subject->activityLabel();
        }

        $name = $subject->getAttribute('name');

        return is_string($name) && $name !== ''
            ? $name
            : Str::headline(class_basename($subject)).' #'.$subject->getKey();
    }

    /**
     * "created" + user "Jane Doe" → "Created user Jane Doe".
     */
    private function describe(string $action, ?Model $subject, ?string $label): string
    {
        $verb = Str::ucfirst(Str::lower(Str::headline($action)));

        if (! $subject || $label === null) {
            return $verb;
        }

        $type = method_exists($subject, 'activitySubjectType')
            ? (string) $subject->activitySubjectType()
            : Str::lower(Str::headline(class_basename($subject)));

        return Str::startsWith(Str::lower($label), $type)
            ? "{$verb} {$label}"
            : "{$verb} {$type} {$label}";
    }

    /**
     * IP and user agent of the current HTTP request; nothing for console
     * commands, jobs and the scheduler. Headers, cookies and session data are
     * never stored.
     *
     * @return array{0: string|null, 1: string|null}
     */
    private function requestContext(): array
    {
        if (! $this->app->bound('request') || ($this->app->runningInConsole() && ! $this->app->runningUnitTests())) {
            return [null, null];
        }

        $request = $this->app->make('request');
        $userAgent = $request->userAgent();

        return [
            $request->ip(),
            $userAgent ? Str::limit($userAgent, 490, '') : null,
        ];
    }
}
