<?php

namespace Database\Factories;

use App\Models\Story;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Frame>
 */
class FrameFactory extends Factory
{
    public function definition(): array
    {
        return [
            'story_id' => Story::factory(),
            'order_index' => fake()->numberBetween(0, 99),
            'media_type' => fake()->randomElement(['image', 'video']),
            'media_url' => 'images/placeholder/'.fake()->numberBetween(1, 10).'.jpg',
            'thumbnail_url' => null,
            'text_content' => fake()->optional()->sentence(),
            'audio_url' => null,
            'duration' => 5000,
            'settings' => null,
        ];
    }

    public function image(): static
    {
        return $this->state(['media_type' => 'image']);
    }

    public function video(): static
    {
        return $this->state(['media_type' => 'video']);
    }
}
