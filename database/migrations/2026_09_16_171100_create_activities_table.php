<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('activities', function (Blueprint $table) {
            $table->id();

            // The actor. Null for console commands, jobs and the scheduler.
            // No foreign key: history must survive when a user is deleted.
            $table->unsignedBigInteger('user_id')->nullable();

            // Free-form so modules can add their own actions (created, login, synced...).
            $table->string('action', 50);

            // The affected record (users use integer ids). Nullable for actions
            // without a subject, e.g. an export. Not constrained: subjects may be deleted.
            $table->string('subject_type')->nullable();
            $table->unsignedBigInteger('subject_id')->nullable();
            // Snapshot so the entry stays readable after the subject is deleted.
            $table->string('subject_label')->nullable();

            // Plain text, no HTML.
            $table->string('description', 500)->nullable();

            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->json('changed_fields')->nullable();
            $table->json('metadata')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent', 500)->nullable();

            // Immutable records: no updated_at.
            $table->timestamp('created_at')->useCurrent();

            // Rows are append-only, so the primary key follows creation order:
            // the feed pages newest-first on `id` (cursor pagination).
            // A user's own history.
            $table->index(['user_id', 'id']);
            // A record's history.
            $table->index(['subject_type', 'subject_id', 'id']);
            // Action filter.
            $table->index(['action', 'id']);
            // Date range filter.
            $table->index('created_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('activities');
    }
};
