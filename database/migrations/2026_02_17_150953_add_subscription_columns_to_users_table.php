<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->string('subscription_tier')->default('free')->after('password');
            $table->string('subscription_id')->nullable()->after('subscription_tier');
            $table->string('subscription_status')->default('active')->after('subscription_id');
            $table->unsignedInteger('story_count')->default(0)->after('subscription_status');
            $table->boolean('is_admin')->default(false)->after('story_count');
            $table->boolean('is_suspended')->default(false)->after('is_admin');
            $table->text('suspended_reason')->nullable()->after('is_suspended');
            $table->timestamp('last_login_at')->nullable()->after('suspended_reason');
            $table->json('settings')->nullable()->after('last_login_at');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table): void {
            $table->dropColumn([
                'subscription_tier',
                'subscription_id',
                'subscription_status',
                'story_count',
                'is_admin',
                'is_suspended',
                'suspended_reason',
                'last_login_at',
                'settings',
            ]);
        });
    }
};
