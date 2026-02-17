<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('frames', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('order_index');
            $table->string('media_type');
            $table->string('media_url');
            $table->string('thumbnail_url')->nullable();
            $table->text('text_content')->nullable();
            $table->string('audio_url')->nullable();
            $table->unsignedInteger('duration')->default(5000);
            $table->json('settings')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->unique(['story_id', 'order_index']);
            $table->index('story_id');
            $table->index(['story_id', 'order_index']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('frames');
    }
};
