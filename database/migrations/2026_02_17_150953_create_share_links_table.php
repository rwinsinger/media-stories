<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('share_links', function (Blueprint $table): void {
            $table->uuid('id')->primary();
            $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
            $table->string('token')->unique();
            $table->timestamp('expires_at');
            $table->unsignedInteger('view_count')->default(0);
            $table->unsignedInteger('max_views')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('token');
            $table->index('story_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('share_links');
    }
};
