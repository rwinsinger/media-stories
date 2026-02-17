<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\ActivityLog>
 */
class ActivityLogFactory extends Factory
{
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'action' => fake()->randomElement(['story.created', 'story.updated', 'friend.accepted', 'user.login']),
            'action_category' => fake()->randomElement(['auth', 'story', 'user', 'admin', 'subscription', 'share']),
            'resource_type' => null,
            'resource_id' => null,
            'details' => null,
            'ip_address' => fake()->ipv4(),
            'user_agent' => fake()->userAgent(),
            'is_admin_action' => false,
            'target_user_id' => null,
        ];
    }

    public function adminAction(): static
    {
        return $this->state(['is_admin_action' => true]);
    }
}
