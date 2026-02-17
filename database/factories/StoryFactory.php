<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Story>
 */
class StoryFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'title' => fake()->sentence(3),
            'description' => fake()->optional()->paragraph(),
            'is_published' => false,
            'is_featured' => false,
            'is_flagged' => false,
            'flagged_reason' => null,
            'frame_count' => 0,
            'view_count' => fake()->numberBetween(0, 500),
            'settings' => null,
        ];
    }

    public function published(): static
    {
        return $this->state(['is_published' => true]);
    }

    public function featured(): static
    {
        return $this->state(['is_featured' => true, 'is_published' => true]);
    }

    public function flagged(): static
    {
        return $this->state([
            'is_flagged' => true,
            'flagged_reason' => fake()->sentence(),
        ]);
    }
}
