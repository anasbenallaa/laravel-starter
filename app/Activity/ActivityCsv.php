<?php

namespace App\Activity;

use App\Models\Activity;
use Illuminate\Database\Eloquent\Relations\Relation;
use Illuminate\Support\Str;

/**
 * CSV representation of activities. Values are neutralized against formula
 * injection, so opening the file in a spreadsheet never runs anything.
 */
final class ActivityCsv
{
    /**
     * Column header translation keys (activities.csv.*).
     *
     * @var list<string>
     */
    public const array HEADERS = [
        'date',
        'actor',
        'actor_email',
        'action',
        'description',
        'subject_type',
        'subject_id',
        'subject',
        'changes',
        'metadata',
        'ip_address',
    ];

    /**
     * Column headers in the current language. Values stay as stored (action
     * identifiers, descriptions, field names), so exports remain parseable.
     *
     * @return list<string>
     */
    public static function headers(): array
    {
        return array_map(fn (string $column) => (string) __("activities.csv.{$column}"), self::HEADERS);
    }

    /**
     * @return list<string>
     */
    public static function row(Activity $activity): array
    {
        return array_map(self::safe(...), [
            $activity->created_at->toIso8601String(),
            $activity->user->name ?? (string) __($activity->user_id !== null ? 'activities.actor.deleted_user' : 'activities.actor.system'),
            $activity->user->email ?? '',
            $activity->action,
            (string) $activity->description,
            $activity->subject_type
                ? Str::headline(class_basename(Relation::getMorphedModel($activity->subject_type) ?? $activity->subject_type))
                : '',
            $activity->subject_id !== null ? (string) $activity->subject_id : '',
            (string) $activity->subject_label,
            self::changes($activity),
            $activity->metadata ? (string) json_encode($activity->metadata, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '',
            (string) $activity->ip_address,
        ]);
    }

    /**
     * "name: Jane Roe → Jane Doe; email: … → …" for updates; the stored values
     * for creates and deletes.
     */
    private static function changes(Activity $activity): string
    {
        $old = $activity->old_values ?? [];
        $new = $activity->new_values ?? [];

        if ($old !== [] && $new !== []) {
            return collect($activity->changed_fields ?? array_keys($new))
                ->map(fn (string $field) => $field.': '.self::scalar($old[$field] ?? null).' → '.self::scalar($new[$field] ?? null))
                ->implode('; ');
        }

        return collect($new ?: $old)
            ->map(fn (mixed $value, string $field) => $field.': '.self::scalar($value))
            ->implode('; ');
    }

    private static function scalar(mixed $value): string
    {
        return match (true) {
            $value === null => '',
            is_bool($value) => $value ? 'true' : 'false',
            is_scalar($value) => (string) $value,
            default => (string) json_encode($value, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
        };
    }

    /**
     * Prefix values a spreadsheet would treat as a formula.
     */
    private static function safe(string $value): string
    {
        return $value !== '' && in_array($value[0], ['=', '+', '-', '@', "\t", "\r"], true)
            ? "'".$value
            : $value;
    }
}
