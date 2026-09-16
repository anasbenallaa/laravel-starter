<?php

namespace App\Observers;

use App\Activity\ActivityAction;
use App\Activity\AuditableAttributes;
use App\Contracts\ActivityLoggerInterface;
use Illuminate\Database\Eloquent\Model;

/**
 * The one generic observer behind the Auditable trait. It only turns model
 * lifecycle events into safe activity records; it never runs domain logic.
 *
 * Note: query-builder updates and deletes (Model::where(...)->update()) don't
 * fire model events. Update models one by one, or log one explicit activity
 * for the bulk operation through ActivityLoggerInterface.
 */
class ActivityObserver
{
    public function __construct(private ActivityLoggerInterface $logger) {}

    public function created(Model $model): void
    {
        $this->logger->log(
            action: ActivityAction::CREATED,
            subject: $model,
            newValues: AuditableAttributes::filter($model, $model->getAttributes()),
        );
    }

    public function updated(Model $model): void
    {
        $newValues = AuditableAttributes::filter($model, $model->getChanges());

        // Only hidden, sensitive or ignored fields (e.g. updated_at) changed.
        if ($newValues === []) {
            return;
        }

        $oldValues = [];

        foreach (array_keys($newValues) as $key) {
            $oldValues[$key] = AuditableAttributes::normalize($model->getRawOriginal($key));
        }

        $this->logger->log(
            action: ActivityAction::UPDATED,
            subject: $model,
            oldValues: $oldValues,
            newValues: $newValues,
        );
    }

    public function deleted(Model $model): void
    {
        $softDeletes = method_exists($model, 'isForceDeleting');

        // A force delete fires both deleted and forceDeleted; log it once.
        if ($softDeletes && $model->isForceDeleting()) {
            return;
        }

        $this->logger->log(
            action: $softDeletes ? ActivityAction::TRASHED : ActivityAction::DELETED,
            subject: $model,
            oldValues: AuditableAttributes::filter($model, $model->getAttributes()),
        );
    }

    public function restored(Model $model): void
    {
        $this->logger->log(action: ActivityAction::RESTORED, subject: $model);
    }

    public function forceDeleted(Model $model): void
    {
        $this->logger->log(
            action: ActivityAction::FORCE_DELETED,
            subject: $model,
            oldValues: AuditableAttributes::filter($model, $model->getAttributes()),
        );
    }
}
