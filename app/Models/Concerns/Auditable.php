<?php

namespace App\Models\Concerns;

use App\Observers\ActivityObserver;
use Illuminate\Support\Str;

/**
 * Opt a model into the activity log:
 *
 *     class Invoice extends Model
 *     {
 *         use Auditable;
 *     }
 *
 * created, updated, deleted and restored events are then recorded
 * automatically. Override activityLabel(), auditExclude() or auditInclude() to
 * customise. See docs/activity-log.md.
 */
trait Auditable
{
    public static function bootAuditable(): void
    {
        // observe() instantiates the model, which isn't allowed mid-boot.
        static::whenBooted(fn () => static::observe(ActivityObserver::class));
    }

    /**
     * Human-readable name kept with each activity, so the entry stays readable
     * after the record is deleted. Defaults to "Invoice #12".
     */
    public function activityLabel(): string
    {
        return Str::headline(class_basename($this)).' #'.$this->getKey();
    }

    /**
     * Lowercase noun used in descriptions, e.g. "invoice" in "Created invoice #12".
     */
    public function activitySubjectType(): string
    {
        return Str::lower(Str::headline(class_basename($this)));
    }

    /**
     * Extra attributes to never log. Sensitive names, hidden attributes and
     * timestamps are always excluded.
     *
     * @return list<string>
     */
    public function auditExclude(): array
    {
        return [];
    }

    /**
     * When not empty, only these attributes are logged (exclusions still apply).
     *
     * @return list<string>
     */
    public function auditInclude(): array
    {
        return [];
    }
}
