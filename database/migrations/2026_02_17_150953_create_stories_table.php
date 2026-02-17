<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stories', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->boolean('is_published')->default(false);
            $table->boolean('is_featured')->default(false);
            $table->boolean('is_flagged')->default(false);
            $table->text('flagged_reason')->nullable();
            $table->unsignedInteger('frame_count')->default(0);
            $table->unsignedInteger('view_count')->default(0);
            $table->json('settings')->nullable();
            $table->timestamps();

            $table->index('user_id');
            $table->index('is_published');
            $table->index('is_featured');
            $table->index('is_flagged');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stories');
    }
};
