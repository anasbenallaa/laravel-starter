<?php

use App\Enums\NotificationLevel;
use App\Notifications\Data\NotificationData;

test('only the required fields are needed', function () {
    $data = new NotificationData(
        event: 'sync.completed',
        title: 'Synchronization completed',
        message: 'Your data has been synchronized successfully.',
    );

    expect($data->toArray())->toBe([
        'version' => 1,
        'title' => 'Synchronization completed',
        'message' => 'Your data has been synchronized successfully.',
        'category' => 'sync',
        'event' => 'sync.completed',
        'level' => 'info',
        'icon' => null,
        'action' => null,
        'actor' => null,
        'subject' => null,
        'metadata' => [],
    ]);
});

test('optional groups are serialized when provided', function () {
    $data = new NotificationData(
        event: 'order.created',
        title: 'New order',
        message: 'Order #123 has been created.',
        level: NotificationLevel::Success,
        category: 'sales',
        icon: 'package',
        actionUrl: '/orders/123',
        actionLabel: 'View order',
        actorType: 'user',
        actorId: 5,
        actorName: 'John Doe',
        subjectType: 'order',
        subjectId: 123,
        metadata: ['total' => '19.99'],
    );

    expect($data->toArray())->toMatchArray([
        'category' => 'sales',
        'level' => 'success',
        'icon' => 'package',
        'action' => ['label' => 'View order', 'url' => '/orders/123'],
        'actor' => ['type' => 'user', 'id' => 5, 'name' => 'John Doe'],
        'subject' => ['type' => 'order', 'id' => 123],
        'metadata' => ['total' => '19.99'],
    ]);
});

test('the event must be a lowercase dot-separated identifier', function (string $event) {
    new NotificationData(event: $event, title: 'Title', message: 'Message');
})->with(['', 'Order.Created', 'order created', '.order', 'order.'])
    ->throws(InvalidArgumentException::class);

test('title and message cannot be blank', function (string $title, string $message) {
    new NotificationData(event: 'system.warning', title: $title, message: $message);
})->with([
    ['', 'Message'],
    ['Title', '   '],
])->throws(InvalidArgumentException::class);

test('unsafe action urls are rejected', function (string $url) {
    new NotificationData(event: 'system.warning', title: 'Title', message: 'Message', actionUrl: $url);
})->with([
    'javascript:alert(1)',
    '//evil.test/path',
    '/\\evil.test',
    'mailto:someone@example.com',
    'orders/123',
])->throws(InvalidArgumentException::class);

test('relative and http(s) action urls are accepted', function (string $url) {
    $data = new NotificationData(event: 'system.warning', title: 'Title', message: 'Message', actionUrl: $url);

    expect($data->toArray()['action']['url'] ?? null)->toBe($url);
})->with([
    '/orders/123',
    'https://example.com/orders/123',
    'http://localhost:8000/orders/123?tab=items',
]);
