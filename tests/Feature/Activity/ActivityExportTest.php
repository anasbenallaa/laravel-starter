<?php

use App\Contracts\ActivityLoggerInterface;
use App\Models\Activity;
use App\Models\User;

function exportCsv($response): array
{
    $lines = array_filter(explode("\n", trim($response->streamedContent())));

    return array_map(fn (string $line) => str_getcsv($line, escape: ''), array_values($lines));
}

test('guests cannot export', function () {
    $this->get(route('activities.export'))->assertRedirect(route('login'));
});

test('exporting requires the activities.export permission', function () {
    $viewer = userWithPermissions(['activities.view.all'], 'Auditor');

    $this->actingAs($viewer)->get(route('activities.export'))->assertForbidden();

    expect(Activity::query()->where('action', 'exported')->exists())->toBeFalse();
});

test('users export only their own activity, even when asking for another user', function () {
    $me = userWithPermissions(['activities.export'], 'Exporter');
    $me->update(['name' => 'Me']);
    $other = User::factory()->create();
    app(ActivityLoggerInterface::class)->log(action: 'exported', description: 'Mine', actor: $me);
    app(ActivityLoggerInterface::class)->log(action: 'exported', description: 'Theirs', actor: $other);

    $response = $this->actingAs($me)->get(route('activities.export', ['user' => $other->id]));

    $response->assertOk()
        ->assertHeader('Content-Type', 'text/csv; charset=UTF-8')
        ->assertDownload();

    $rows = exportCsv($response);
    $descriptions = array_column(array_slice($rows, 1), 4);

    expect($rows[0])->toBe(['Date', 'Actor', 'Actor email', 'Action', 'Description', 'Subject type', 'Subject ID', 'Subject', 'Changes', 'Metadata', 'IP address'])
        ->and($descriptions)->toContain('Mine')
        ->and($descriptions)->not->toContain('Theirs')
        ->and(array_unique(array_column(array_slice($rows, 1), 1)))->toBe(['Me']);
});

test('the export applies the same filters as the timeline', function () {
    $auditor = userWithPermissions(['activities.view.all', 'activities.export'], 'Auditor');
    $jane = User::factory()->create(['name' => 'Jane Roe']);
    app(ActivityLoggerInterface::class)->log(action: 'connected', description: 'Connected MeditLink', actor: $jane);
    app(ActivityLoggerInterface::class)->log(action: 'synced', description: 'Synced orders', actor: $jane);
    $jane->update(['name' => 'Jane Doe']);

    $rows = exportCsv($this->actingAs($auditor)->get(route('activities.export', ['user' => $jane->id, 'action' => 'connected'])));

    expect($rows)->toHaveCount(2)
        ->and($rows[1][3])->toBe('connected')
        ->and($rows[1][4])->toBe('Connected MeditLink');

    $updates = exportCsv($this->actingAs($auditor)->get(route('activities.export', ['action' => 'updated'])));

    expect($updates[1][8])->toBe('name: Jane Roe → Jane Doe')
        ->and($updates[1][5])->toBe('User');
});

test('exporting is recorded in the activity log without appearing in its own file', function () {
    $user = userWithPermissions(['activities.export'], 'Exporter');
    app(ActivityLoggerInterface::class)->log(action: 'synced', description: 'Synced orders', actor: $user);

    $rows = exportCsv($this->actingAs($user)->get(route('activities.export', ['action' => 'synced'])));

    $entry = Activity::query()->where('action', 'exported')->sole();

    expect($entry->user_id)->toBe($user->id)
        ->and($entry->description)->toBe('Exported 1 activity to CSV')
        ->and($entry->metadata)->toBe(['rows' => 1, 'filters' => ['action' => 'synced']])
        ->and(array_column(array_slice($rows, 1), 3))->not->toContain('exported');
});

test('values that look like spreadsheet formulas are neutralized', function () {
    $user = userWithPermissions(['activities.export'], 'Exporter');
    app(ActivityLoggerInterface::class)->log(action: 'imported', description: '=HYPERLINK("http://evil.test")', actor: $user);

    $rows = exportCsv($this->actingAs($user)->get(route('activities.export', ['action' => 'imported'])));

    expect($rows[1][4])->toBe('\'=HYPERLINK("http://evil.test")');
});
