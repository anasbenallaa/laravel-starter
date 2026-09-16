<?php

namespace App\Notifications\Data;

use App\Enums\NotificationLevel;
use InvalidArgumentException;

/**
 * The payload of every application notification, stored as JSON in
 * `notifications.data`.
 *
 * Only event, title, message and level are required. Everything feature
 * specific (order numbers, integration names, ...) belongs in subject or
 * metadata. Both are sent to the browser, so never put secrets in them.
 */
final readonly class NotificationData
{
    /**
     * Bump when the stored shape changes incompatibly, so old rows can still
     * be told apart from new ones.
     */
    public const int VERSION = 1;

    /**
     * @param  string  $event  Dot-separated identifier, e.g. "order.created" or "integration.sync.failed".
     * @param  string|null  $category  Defaults to the first segment of the event ("order" for "order.created").
     * @param  string|null  $icon  Optional frontend icon name; the level icon is used when omitted or unknown.
     * @param  array<string, mixed>  $metadata
     */
    public function __construct(
        public string $event,
        public string $title,
        public string $message,
        public NotificationLevel $level = NotificationLevel::Info,
        public ?string $category = null,
        public ?string $icon = null,
        public ?string $actionUrl = null,
        public ?string $actionLabel = null,
        public ?string $actorType = null,
        public string|int|null $actorId = null,
        public ?string $actorName = null,
        public ?string $subjectType = null,
        public string|int|null $subjectId = null,
        public array $metadata = [],
    ) {
        if (preg_match('/^[a-z0-9_]+(\.[a-z0-9_]+)*$/', $event) !== 1) {
            throw new InvalidArgumentException(
                "Notification event [{$event}] must be lowercase dot-separated segments, e.g. \"order.created\".",
            );
        }

        if (trim($title) === '' || trim($message) === '') {
            throw new InvalidArgumentException('Notification title and message cannot be empty.');
        }

        if ($actionUrl !== null && ! self::isSafeUrl($actionUrl)) {
            throw new InvalidArgumentException(
                "Notification action URL [{$actionUrl}] must be a relative path or an http(s) URL.",
            );
        }
    }

    /**
     * Allows app-relative paths ("/orders/1") and absolute http(s) URLs, and
     * rejects protocol-relative ("//evil.test") and script (javascript:) URLs.
     */
    public static function isSafeUrl(string $url): bool
    {
        if (str_starts_with($url, '/')) {
            return ! str_starts_with($url, '//') && ! str_starts_with($url, '/\\');
        }

        $scheme = parse_url($url, PHP_URL_SCHEME);

        return in_array(is_string($scheme) ? strtolower($scheme) : null, ['http', 'https'], true)
            && is_string(parse_url($url, PHP_URL_HOST));
    }

    public function category(): string
    {
        return $this->category ?? explode('.', $this->event)[0];
    }

    /**
     * The stored JSON shape. Optional groups are null when none of their
     * fields were given, so the frontend can check a single key.
     *
     * @return array{
     *     version: int,
     *     title: string,
     *     message: string,
     *     category: string,
     *     event: string,
     *     level: string,
     *     icon: string|null,
     *     action: array{label: string|null, url: string}|null,
     *     actor: array{type: string|null, id: string|int|null, name: string|null}|null,
     *     subject: array{type: string|null, id: string|int|null}|null,
     *     metadata: array<string, mixed>,
     * }
     */
    public function toArray(): array
    {
        return [
            'version' => self::VERSION,
            'title' => $this->title,
            'message' => $this->message,
            'category' => $this->category(),
            'event' => $this->event,
            'level' => $this->level->value,
            'icon' => $this->icon,
            'action' => $this->actionUrl === null ? null : [
                'label' => $this->actionLabel,
                'url' => $this->actionUrl,
            ],
            'actor' => $this->actorType === null && $this->actorId === null && $this->actorName === null ? null : [
                'type' => $this->actorType,
                'id' => $this->actorId,
                'name' => $this->actorName,
            ],
            'subject' => $this->subjectType === null && $this->subjectId === null ? null : [
                'type' => $this->subjectType,
                'id' => $this->subjectId,
            ],
            'metadata' => $this->metadata,
        ];
    }
}
