<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Notification>
 */
class NotificationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'type' => fake()->randomElement(['friend_request', 'friend_accepted', 'story_shared', 'story_comment']),
            'title' => fake()->sentence(4),
            'message' => fake()->sentence(),
            'link_url' => null,
            'is_read' => false,
            'read_at' => null,
            'resource_type' => null,
            'resource_id' => null,
            'sender_id' => null,
        ];
    }

    public function read(): static
    {
        return $this->state([
            'is_read' => true,
            'read_at' => now(),
        ]);
    }

    public function storyShared(): static
    {
        return $this->state([
            'type' => 'story_shared',
            'title' => 'New story shared with you',
        ]);
    }
}
