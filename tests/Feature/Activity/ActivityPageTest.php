<?php

use App\Contracts\ActivityLoggerInterface;
use App\Models\Activity;
use App\Models\User;
use Illuminate\Support\Carbon;
use Inertia\Testing\AssertableInertia as Assert;

function logActivityFor(User $user, string $action = 'exported', string $description = 'Exported report'): Activity
{
    return app(ActivityLoggerInterface::class)->log(action: $action, description: $description, actor: $user);
}

test('guests are redirected', function () {
    $this->get(route('activities.index'))->assertRedirect(route('login'));
});

test('regular users only see their own activity, even when asking for another user', function () {
    seedAccessControl();
    $me = User::factory()->create();
    $other = User::factory()->create();
    logActivityFor($me, description: 'Mine');
    logActivityFor($other, description: 'Theirs');

    $this->actingAs($me)
        ->get(route('activities.index', ['user' => $other->id]))
        ->assertOk()
        ->assertInertia(fn (Assert $page) => $page
            ->component('activities/index')
            ->where('canViewAll', false)
            ->where('filters.user', null)
            ->where('users', [])
            ->where('activities.data', fn ($data) => collect($data)->every(fn ($activity) => $activity['user_id'] === $me->id)
                && collect($data)->pluck('description')->contains('Mine')
                && ! collect($data)->pluck('description')->contains('Theirs')),
        );
});

test('users with activities.view.all see everyone and can filter by user, action, search and date', function () {
    $auditor = userWithPermissions(['activities.view.all'], 'Auditor');
    $jane = User::factory()->create(['name' => 'Jane Roe', 'email' => 'jane@example.com']);
    $john = User::factory()->create(['name' => 'John Doe']);
    logActivityFor($jane, 'exported', 'Exported monthly report');
    logActivityFor($john, 'connected', 'Connected MeditLink integration');

    $this->actingAs($auditor)
        ->get(route('activities.index', ['user' => $john->id]))
        ->assertInertia(fn (Assert $page) => $page
            ->where('canViewAll', true)
            ->where('filters.user', $john->id)
            ->where('activities.data', fn ($data) => collect($data)->isNotEmpty() && collect($data)->every(fn ($a) => $a['user_id'] === $john->id)),
        );

    $this->actingAs($auditor)
        ->get(route('activities.index', ['action' => 'connected']))
        ->assertInertia(fn (Assert $page) => $page
            ->has('activities.data', 1)
            ->where('activities.data.0.description', 'Connected MeditLink integration')
            ->where('activities.data.0.user.name', 'John Doe'));

    $this->actingAs($auditor)
        ->get(route('activities.index', ['search' => 'jane@example']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activities.data', fn ($data) => collect($data)->pluck('description')->contains('Exported monthly report')
                && ! collect($data)->pluck('description')->contains('Connected MeditLink integration')));

    $this->actingAs($auditor)
        ->get(route('activities.index', ['from' => now()->addDay()->toDateString()]))
        ->assertInertia(fn (Assert $page) => $page->has('activities.data', 0));
});

test('activities load 20 at a time, newest first, with a cursor for the next page', function () {
    $user = User::factory()->create();

    foreach (range(1, 45) as $i) {
        Carbon::setTestNow(now()->addSecond());
        logActivityFor($user, description: "Activity {$i}");
    }
    Carbon::setTestNow();

    $first = $this->actingAs($user)->get(route('activities.index'));

    $first->assertInertia(fn (Assert $page) => $page
        ->has('activities.data', 20)
        ->where('activities.data.0.description', 'Activity 45')
        ->where('activities.data.19.description', 'Activity 26')
        ->whereNot('activities.next_page_url', null));

    $nextUrl = $first->viewData('page')['props']['activities']['next_page_url'];

    $this->actingAs($user)
        ->get($nextUrl)
        ->assertInertia(fn (Assert $page) => $page
            ->has('activities.data', 20)
            ->where('activities.data.0.description', 'Activity 25'));
});

test('updates are presented as readable changes and deleted subjects keep their label', function () {
    $admin = createAdmin();
    $user = User::factory()->create(['name' => 'Old Name']);
    $this->actingAs($admin);
    $user->update(['name' => 'New Name']);
    $user->delete();

    $this->actingAs($admin)
        ->get(route('activities.index', ['action' => 'updated']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activities.data.0.subject_type', 'User')
            ->where('activities.data.0.changes', [['field' => 'name', 'old' => 'Old Name', 'new' => 'New Name']]));

    $this->actingAs($admin)
        ->get(route('activities.index', ['action' => 'deleted']))
        ->assertInertia(fn (Assert $page) => $page
            ->where('activities.data.0.subject_label', 'New Name')
            ->where('activities.data.0.description', 'Deleted user New Name'));
});

test('the activity log has no write endpoints', function () {
    $admin = createAdmin();
    $activity = logActivityFor($admin);

    $this->actingAs($admin)->post('/activities', ['action' => 'forged'])->assertStatus(405);
    $this->actingAs($admin)->patch("/activities/{$activity->id}", ['description' => 'x'])->assertNotFound();
    $this->actingAs($admin)->delete("/activities/{$activity->id}")->assertNotFound();

    expect($activity->fresh()->description)->toBe('Exported report');
});
