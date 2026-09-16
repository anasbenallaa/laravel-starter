<?php

use App\Models\User;
use App\Support\SortOrder;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

$sortable = [
    'name' => 'name',
    'created_at' => 'created_at',
    'email_length' => fn (Builder $query, string $direction) => $query->orderByRaw("length(email) {$direction}"),
];

test('the requested column and direction are used when allowed', function () use ($sortable) {
    $sort = SortOrder::fromRequest(Request::create('/?sort=created_at&direction=desc'), $sortable, default: 'name');

    expect($sort->toArray())->toBe(['column' => 'created_at', 'direction' => 'desc']);
});

test('unknown columns and directions fall back to the defaults', function (string $query, array $expected) use ($sortable) {
    $sort = SortOrder::fromRequest(Request::create("/?{$query}"), $sortable, default: 'name', defaultDirection: 'desc');

    expect($sort->toArray())->toBe($expected);
})->with([
    'nothing requested' => ['', ['column' => 'name', 'direction' => 'desc']],
    'unknown column' => ['sort=password', ['column' => 'name', 'direction' => 'desc']],
    'sql injection' => ['sort=name;drop table users&direction=asc', ['column' => 'name', 'direction' => 'asc']],
    'bad direction' => ['sort=created_at&direction=sideways', ['column' => 'created_at', 'direction' => 'asc']],
    'array input' => ['sort[]=name', ['column' => 'name', 'direction' => 'desc']],
]);

test('it orders the query and breaks ties by primary key', function () use ($sortable) {
    $query = User::query();

    SortOrder::fromRequest(Request::create('/?sort=name&direction=desc'), $sortable, default: 'name')->apply($query);

    expect($query->toBase()->orders)->toBe([
        ['column' => 'name', 'direction' => 'desc'],
        ['column' => 'users.id', 'direction' => 'desc'],
    ]);
});

test('closure sorts receive the query and direction', function () use ($sortable) {
    User::factory()->create(['email' => 'a@x.io']);
    User::factory()->create(['email' => 'longer-address@example.com']);

    $query = User::query();
    SortOrder::fromRequest(Request::create('/?sort=email_length&direction=desc'), $sortable, default: 'name')->apply($query);

    expect($query->pluck('email')->all())->toBe(['longer-address@example.com', 'a@x.io']);
});
