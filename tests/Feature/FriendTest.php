<?php

use App\Models\Friendship;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create(['subscription_tier' => 'free']);
    $this->other = User::factory()->create();
    $this->actingAs($this->user);
});

it('lists accepted friends', function (): void {
    Friendship::factory()->accepted()->create([
        'requester_id' => $this->user->id,
        'addressee_id' => $this->other->id,
    ]);

    $this->getJson('/api/friends')
        ->assertSuccessful()
        ->assertJsonCount(1);
});

it('sends a friend request', function (): void {
    $this->postJson('/api/friends', ['addressee_id' => $this->other->id])
        ->assertStatus(201)
        ->assertJsonFragment(['status' => 'pending']);
});

it('cannot send request to self', function (): void {
    $this->postJson('/api/friends', ['addressee_id' => $this->user->id])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'You cannot send a friend request to yourself.']);
});

it('cannot duplicate friend request', function (): void {
    Friendship::factory()->create([
        'requester_id' => $this->user->id,
        'addressee_id' => $this->other->id,
    ]);

    $this->postJson('/api/friends', ['addressee_id' => $this->other->id])
        ->assertStatus(422);
});

it('accepts a friend request', function (): void {
    $friendship = Friendship::factory()->create([
        'requester_id' => $this->other->id,
        'addressee_id' => $this->user->id,
        'status' => 'pending',
    ]);

    $this->actingAs($this->user)->putJson("/api/friends/{$friendship->id}", ['status' => 'accepted'])
        ->assertSuccessful()
        ->assertJsonFragment(['status' => 'accepted']);
});

it('declines a friend request', function (): void {
    $friendship = Friendship::factory()->create([
        'requester_id' => $this->other->id,
        'addressee_id' => $this->user->id,
        'status' => 'pending',
    ]);

    $this->putJson("/api/friends/{$friendship->id}", ['status' => 'declined'])
        ->assertSuccessful()
        ->assertJsonFragment(['status' => 'declined']);
});

it('can unfriend', function (): void {
    $friendship = Friendship::factory()->accepted()->create([
        'requester_id' => $this->user->id,
        'addressee_id' => $this->other->id,
    ]);

    $this->deleteJson("/api/friends/{$friendship->id}")->assertStatus(204);
    expect(Friendship::find($friendship->id))->toBeNull();
});

it('searches for users by email', function (): void {
    $this->getJson('/api/friends/search?email='.$this->other->email)
        ->assertSuccessful()
        ->assertJsonPath('user.email', $this->other->email);
});

it('enforces free friend limit', function (): void {
    $this->user->update(['subscription_tier' => 'free']);
    $friends = User::factory()->count(10)->create();

    foreach ($friends as $friend) {
        Friendship::factory()->accepted()->create([
            'requester_id' => $this->user->id,
            'addressee_id' => $friend->id,
        ]);
    }

    $newFriend = User::factory()->create();
    $this->postJson('/api/friends', ['addressee_id' => $newFriend->id])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'Friend limit reached for your subscription tier.']);
});
