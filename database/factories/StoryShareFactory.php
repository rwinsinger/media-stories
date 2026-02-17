<?php

namespace Database\Factories;

use App\Models\Story;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\StoryShare>
 */
class StoryShareFactory extends Factory
{
    public function definition(): array
    {
        return [
            'story_id' => Story::factory(),
            'shared_by_user_id' => User::factory(),
            'shared_with_user_id' => User::factory(),
            'permission_level' => 'view',
            'shared_at' => now(),
            'expires_at' => null,
            'view_count' => 0,
            'last_viewed_at' => null,
            'is_revoked' => false,
            'revoked_at' => null,
            'message' => fake()->optional()->sentence(),
        ];
    }

    public function revoked(): static
    {
        return $this->state([
            'is_revoked' => true,
            'revoked_at' => now(),
        ]);
    }
}
