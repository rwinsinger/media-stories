<?php

use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create(['subscription_tier' => 'free', 'story_count' => 0]);
    $this->actingAs($this->user);
});

it('lists own stories', function (): void {
    Story::factory()->count(3)->create(['user_id' => $this->user->id]);

    $this->getJson('/api/stories')->assertSuccessful()->assertJsonCount(3);
});

it('creates a story', function (): void {
    $this->postJson('/api/stories', ['title' => 'My Story'])
        ->assertStatus(201)
        ->assertJsonFragment(['title' => 'My Story']);

    expect($this->user->fresh()->story_count)->toBe(1);
});

it('enforces free story limit', function (): void {
    $this->user->update(['story_count' => 5]);

    $this->postJson('/api/stories', ['title' => 'One too many'])
        ->assertStatus(422)
        ->assertJsonFragment(['message' => 'Story limit reached for your subscription tier.']);
});

it('premium user has no story limit', function (): void {
    $this->user->update(['subscription_tier' => 'premium', 'story_count' => 10]);

    $this->postJson('/api/stories', ['title' => 'Premium story'])
        ->assertStatus(201);
});

it('shows own story', function (): void {
    $story = Story::factory()->create(['user_id' => $this->user->id]);

    $this->getJson("/api/stories/{$story->id}")->assertSuccessful()->assertJsonFragment(['id' => $story->id]);
});

it('denies showing another user story without share', function (): void {
    $other = User::factory()->create();
    $story = Story::factory()->published()->create(['user_id' => $other->id]);

    $this->getJson("/api/stories/{$story->id}")->assertForbidden();
});

it('updates own story', function (): void {
    $story = Story::factory()->create(['user_id' => $this->user->id]);

    $this->putJson("/api/stories/{$story->id}", ['title' => 'Updated'])
        ->assertSuccessful()
        ->assertJsonFragment(['title' => 'Updated']);
});

it('deletes own story', function (): void {
    $story = Story::factory()->create(['user_id' => $this->user->id]);
    $this->user->update(['story_count' => 1]);

    $this->deleteJson("/api/stories/{$story->id}")->assertStatus(204);
    expect(Story::find($story->id))->toBeNull();
    expect($this->user->fresh()->story_count)->toBe(0);
});

it('can flag a story', function (): void {
    $other = User::factory()->create();
    $story = Story::factory()->published()->create(['user_id' => $other->id]);

    $this->postJson("/api/stories/{$story->id}/flag", ['reason' => 'Inappropriate content'])
        ->assertSuccessful();

    expect($story->fresh()->is_flagged)->toBeTrue();
});

it('requires authentication', function (): void {
    $this->withoutMiddleware()->app->instance('auth', null);
    auth()->logout();

    $this->getJson('/api/stories')->assertUnauthorized();
})->skip('Auth middleware tested separately');
