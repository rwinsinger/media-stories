<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->actingAs($this->admin);
});

it('lists all users', function (): void {
    User::factory()->count(3)->create();

    $this->getJson('/api/admin/users')
        ->assertSuccessful()
        ->assertJsonStructure(['data', 'total']);
});

it('denies non-admin access to user list', function (): void {
    $this->actingAs(User::factory()->create(['is_admin' => false]));

    $this->getJson('/api/admin/users')->assertForbidden();
});

it('filters users by search term', function (): void {
    User::factory()->create(['email' => 'alice@example.com', 'name' => 'Alice']);
    User::factory()->create(['email' => 'bob@example.com', 'name' => 'Bob']);

    $this->getJson('/api/admin/users?search=alice')
        ->assertSuccessful()
        ->assertJsonFragment(['email' => 'alice@example.com'])
        ->assertJsonMissing(['email' => 'bob@example.com']);
});

it('filters users by subscription tier', function (): void {
    User::factory()->create(['subscription_tier' => 'premium']);
    User::factory()->create(['subscription_tier' => 'free']);

    $this->getJson('/api/admin/users?tier=premium')
        ->assertSuccessful()
        ->assertJsonFragment(['subscription_tier' => 'premium'])
        ->assertJsonMissing(['subscription_tier' => 'free']);
});

it('filters suspended users', function (): void {
    User::factory()->create(['is_suspended' => true]);
    User::factory()->create(['is_suspended' => false]);

    $response = $this->getJson('/api/admin/users?suspended=1')->assertSuccessful();

    foreach ($response->json('data') as $user) {
        expect($user['is_suspended'])->toBeTrue();
    }
});

it('suspends a user', function (): void {
    $user = User::factory()->create(['is_suspended' => false]);

    $this->putJson("/api/admin/users/{$user->id}", [
        'is_suspended' => true,
        'suspended_reason' => 'Terms of service violation',
    ])->assertSuccessful()->assertJsonFragment(['is_suspended' => true]);

    expect($user->fresh()->is_suspended)->toBeTrue();
    expect($user->fresh()->suspended_reason)->toBe('Terms of service violation');
});

it('changes user subscription tier', function (): void {
    $user = User::factory()->create(['subscription_tier' => 'free']);

    $this->putJson("/api/admin/users/{$user->id}", ['subscription_tier' => 'premium'])
        ->assertSuccessful()
        ->assertJsonFragment(['subscription_tier' => 'premium']);

    expect($user->fresh()->subscription_tier)->toBe('premium');
});

it('grants admin privileges', function (): void {
    $user = User::factory()->create(['is_admin' => false]);

    $this->putJson("/api/admin/users/{$user->id}", ['is_admin' => true])
        ->assertSuccessful()
        ->assertJsonFragment(['is_admin' => true]);

    expect($user->fresh()->is_admin)->toBeTrue();
});
