<?php

namespace App\Activity;

use BackedEnum;
use DateTimeInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;
use JsonSerializable;
use Stringable;
use UnitEnum;

/**
 * Decides which attribute values may be written to the activity log, and
 * makes them safe to store.
 *
 * Precedence, from strongest to weakest:
 *  1. Sensitive names (below) and the model's $hidden attributes are ALWAYS removed.
 *  2. Timestamps (created_at, updated_at, deleted_at) and the primary key are removed.
 *  3. auditExclude() removes more fields.
 *  4. auditInclude(), when not empty, keeps only the listed fields.
 */
final class AuditableAttributes
{
    /**
     * Never logged, whatever a model configures. Matched case-insensitively,
     * including as a suffix (e.g. "stripe_secret", "github_access_token").
     *
     * @var list<string>
     */
    public const array SENSITIVE = [
        'password',
        'password_confirmation',
        'current_password',
        'remember_token',
        'token',
        'api_token',
        'access_token',
        'refresh_token',
        'secret',
        'client_secret',
        'private_key',
        'two_factor_secret',
        'two_factor_recovery_codes',
        'authorization',
        'cookie',
        'session',
    ];

    /** Strings longer than this are truncated. */
    public const int MAX_STRING_LENGTH = 500;

    /**
     * @var list<string>
     */
    private const array TIMESTAMPS = ['created_at', 'updated_at', 'deleted_at'];

    /**
     * @param  array<string, mixed>  $attributes
     * @return array<string, mixed>
     */
    public static function filter(Model $model, array $attributes): array
    {
        $include = method_exists($model, 'auditInclude') ? $model->auditInclude() : [];
        $exclude = [
            ...self::TIMESTAMPS,
            $model->getKeyName(),
            ...(method_exists($model, 'auditExclude') ? $model->auditExclude() : []),
        ];
        $hidden = $model->getHidden();

        $safe = [];

        foreach ($attributes as $key => $value) {
            if (self::isSensitive($key) || in_array($key, $hidden, true) || in_array($key, $exclude, true)) {
                continue;
            }

            if ($include !== [] && ! in_array($key, $include, true)) {
                continue;
            }

            $safe[$key] = self::normalize($value);
        }

        return $safe;
    }

    public static function isSensitive(string $key): bool
    {
        $key = Str::lower($key);

        foreach (self::SENSITIVE as $sensitive) {
            if ($key === $sensitive || str_ends_with($key, '_'.$sensitive)) {
                return true;
            }
        }

        return false;
    }

    /**
     * Scalars stay as-is; dates become ISO strings; enums their value; binary
     * and oversized content is replaced by a placeholder.
     */
    public static function normalize(mixed $value): mixed
    {
        return match (true) {
            $value === null, is_bool($value), is_int($value), is_float($value) => $value,
            $value instanceof DateTimeInterface => $value->format(DATE_ATOM),
            $value instanceof BackedEnum => $value->value,
            $value instanceof UnitEnum => $value->name,
            is_string($value) => self::normalizeString($value),
            $value instanceof Stringable => self::normalizeString((string) $value),
            is_array($value), $value instanceof JsonSerializable => self::normalizeStructured($value),
            default => '[unsupported value]',
        };
    }

    private static function normalizeString(string $value): string
    {
        if (! mb_check_encoding($value, 'UTF-8')) {
            return '[binary data]';
        }

        return mb_strlen($value) > self::MAX_STRING_LENGTH
            ? mb_substr($value, 0, self::MAX_STRING_LENGTH).'…'
            : $value;
    }

    /**
     * @param  array<mixed>|JsonSerializable  $value
     */
    private static function normalizeStructured(array|JsonSerializable $value): mixed
    {
        $encoded = json_encode($value);

        if ($encoded === false || strlen($encoded) > self::MAX_STRING_LENGTH * 4) {
            return '[large value]';
        }

        return json_decode($encoded, true);
    }
}
