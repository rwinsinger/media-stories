<?php

use App\Models\ShareLink;
use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->story = Story::factory()->published()->create(['user_id' => $this->user->id]);
    $this->actingAs($this->user);
});

it('creates a share link', function (): void {
    $this->postJson('/api/share-links', ['story_id' => $this->story->id])
        ->assertStatus(201)
        ->assertJsonStructure(['token', 'url', 'expires_at']);
});

it('denies creating share link for another user story', function (): void {
    $other = User::factory()->create();
    $otherStory = Story::factory()->create(['user_id' => $other->id]);

    $this->postJson('/api/share-links', ['story_id' => $otherStory->id])
        ->assertForbidden();
});

it('shows story via public share link', function (): void {
    $shareLink = ShareLink::factory()->create([
        'story_id' => $this->story->id,
        'expires_at' => now()->addHours(72),
    ]);

    $this->getJson("/share/{$shareLink->token}")
        ->assertSuccessful()
        ->assertJsonPath('story.id', $this->story->id);
});

it('rejects expired share link', function (): void {
    $shareLink = ShareLink::factory()->expired()->create(['story_id' => $this->story->id]);

    $this->getJson("/share/{$shareLink->token}")->assertStatus(410);
});
