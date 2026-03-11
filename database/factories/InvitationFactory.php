<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Str;

/**
 * @extends \Illuminate\Database\Eloquent\Factories\Factory<\App\Models\Invitation>
 */
class InvitationFactory extends Factory
{
    public function definition(): array
    {
        return [
            'invited_by' => User::factory(),
            'email' => fake()->unique()->safeEmail(),
            'token' => Str::uuid()->toString(),
            'accepted_at' => null,
            'expires_at' => now()->addHours(72),
            'created_at' => now(),
        ];
    }

    public function accepted(): static
    {
        return $this->state([
            'accepted_at' => now(),
        ]);
    }

    public function expired(): static
    {
        return $this->state([
            'expires_at' => now()->subHour(),
        ]);
    }
}
