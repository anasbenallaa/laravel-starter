<?php

use App\Activity\AuditableAttributes;
use App\Models\Activity;
use App\Models\Concerns\Auditable;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A throwaway auditable model with soft deletes and custom audit settings.
 */
class AuditedWidget extends Model
{
    use Auditable, SoftDeletes;

    protected $table = 'audited_widgets';

    protected $guarded = [];

    protected $hidden = ['internal_notes'];

    protected $casts = ['settings' => 'array', 'active' => 'boolean'];

    public function activityLabel(): string
    {
        return "Widget {$this->code}";
    }

    public function auditExclude(): array
    {
        return ['view_count'];
    }
}

class IncludeOnlyWidget extends Model
{
    use Auditable;

    protected $table = 'audited_widgets';

    protected $guarded = [];

    public function auditInclude(): array
    {
        return ['status'];
    }
}

beforeEach(function () {
    Schema::create('audited_widgets', function (Blueprint $table) {
        $table->id();
        $table->string('code')->nullable();
        $table->string('status')->nullable();
        $table->integer('amount')->nullable();
        $table->boolean('active')->default(true);
        $table->json('settings')->nullable();
        $table->text('body')->nullable();
        $table->string('api_token')->nullable();
        $table->string('password')->nullable();
        $table->string('internal_notes')->nullable();
        $table->integer('view_count')->default(0);
        $table->timestamps();
        $table->softDeletes();
    });
});

test('creating a model logs safe values with the acting user', function () {
    $actor = User::factory()->create(['name' => 'Jane Actor']);
    $this->actingAs($actor);

    $widget = AuditedWidget::create([
        'code' => 'W-1', 'status' => 'draft', 'amount' => 100, 'settings' => ['a' => 1],
        'api_token' => 'secret-token', 'password' => 'hunter2', 'internal_notes' => 'hidden', 'view_count' => 5,
    ]);

    $activity = Activity::query()->where('subject_type', $widget->getMorphClass())->sole();

    expect($activity->action)->toBe('created')
        ->and($activity->user_id)->toBe($actor->id)
        ->and($activity->subject_id)->toBe($widget->id)
        ->and($activity->subject_label)->toBe('Widget W-1')
        ->and($activity->description)->toBe('Created audited widget Widget W-1')
        ->and($activity->new_values)->toMatchArray(['code' => 'W-1', 'status' => 'draft', 'amount' => 100])
        ->and($activity->new_values)->not->toHaveKeys(['api_token', 'password', 'internal_notes', 'view_count', 'id', 'created_at', 'updated_at'])
        ->and($activity->old_values)->toBeNull();
});

test('updating logs only the fields that actually changed', function () {
    $widget = AuditedWidget::create(['code' => 'W-2', 'status' => 'pending', 'amount' => 100]);

    $widget->update(['status' => 'completed', 'amount' => 120, 'code' => 'W-2']);

    $activity = Activity::query()->where('action', 'updated')->sole();

    expect($activity->old_values)->toBe(['status' => 'pending', 'amount' => 100])
        ->and($activity->new_values)->toBe(['status' => 'completed', 'amount' => 120])
        ->and($activity->changed_fields)->toBe(['status', 'amount']);
});

test('no activity is logged when only ignored or sensitive fields change', function () {
    $widget = AuditedWidget::create(['code' => 'W-3']);

    $widget->update(['api_token' => 'rotated', 'password' => 'new', 'internal_notes' => 'x', 'view_count' => 99]);
    $widget->touch();

    expect(Activity::query()->where('action', 'updated')->count())->toBe(0);
});

test('soft deletes, restores and force deletes are logged once each', function () {
    $widget = AuditedWidget::create(['code' => 'W-4', 'status' => 'live']);

    $widget->delete();
    $widget->restore();
    $widget->forceDelete();

    expect(Activity::query()->orderBy('id')->pluck('action')->all())->toBe(['created', 'trashed', 'restored', 'force_deleted']);

    $forceDeleted = Activity::query()->where('action', 'force_deleted')->sole();

    expect($forceDeleted->old_values)->toMatchArray(['code' => 'W-4', 'status' => 'live'])
        ->and($forceDeleted->subject_label)->toBe('Widget W-4');
});

test('auditInclude limits the logged fields', function () {
    IncludeOnlyWidget::create(['code' => 'W-5', 'status' => 'draft', 'amount' => 1]);

    expect(Activity::query()->sole()->new_values)->toBe(['status' => 'draft'])
        ->and(Activity::query()->sole()->subject_label)->toBe('Include Only Widget #1');
});

test('large and binary values are summarized, never stored raw', function () {
    AuditedWidget::create(['code' => 'W-6', 'body' => str_repeat('a', 2000)]);
    $values = Activity::query()->sole()->new_values;

    expect(mb_strlen($values['body']))->toBe(501)
        ->and(AuditableAttributes::normalize("\xB1\x31"))->toBe('[binary data]');
});

test('activities without an authenticated user are attributed to the system', function () {
    AuditedWidget::create(['code' => 'W-7']);

    expect(Activity::query()->sole()->user_id)->toBeNull();
});

test('users are audited without their password or tokens', function () {
    $user = User::factory()->create(['name' => 'Jane Doe']);
    $user->update(['password' => 'a-new-password', 'remember_token' => 'abc']);
    $user->update(['name' => 'Jane Roe']);

    $activities = Activity::query()->where('subject_id', $user->id)->orderBy('id')->get();

    expect($activities->pluck('action')->all())->toBe(['created', 'updated'])
        ->and($activities[0]->description)->toBe('Created user Jane Doe')
        ->and($activities[0]->new_values)->not->toHaveKeys(['password', 'remember_token', 'two_factor_secret'])
        ->and($activities[1]->old_values)->toBe(['name' => 'Jane Doe'])
        ->and($activities[1]->new_values)->toBe(['name' => 'Jane Roe']);
});
