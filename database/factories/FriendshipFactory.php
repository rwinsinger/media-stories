<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Friendship>
 */
class FriendshipFactory extends Factory
{
    public function definition(): array
    {
        return [
            'requester_id' => User::factory(),
            'addressee_id' => User::factory(),
            'status' => 'pending',
            'requested_at' => now(),
            'responded_at' => null,
        ];
    }

    public function accepted(): static
    {
        return $this->state([
            'status' => 'accepted',
            'responded_at' => now(),
        ]);
    }

    public function declined(): static
    {
        return $this->state([
            'status' => 'declined',
            'responded_at' => now(),
        ]);
    }

    public function blocked(): static
    {
        return $this->state([
            'status' => 'blocked',
            'responded_at' => now(),
        ]);
    }
}
