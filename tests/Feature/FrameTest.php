<?php

use App\Models\Frame;
use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->story = Story::factory()->create(['user_id' => $this->user->id]);
    $this->actingAs($this->user);
});

it('lists frames for a story', function (): void {
    Frame::factory()->count(3)->sequence(
        ['order_index' => 0],
        ['order_index' => 1],
        ['order_index' => 2],
    )->create(['story_id' => $this->story->id]);

    $this->getJson("/api/stories/{$this->story->id}/frames")
        ->assertSuccessful()
        ->assertJsonCount(3);
});

it('creates a frame', function (): void {
    $this->postJson("/api/stories/{$this->story->id}/frames", [
        'media_type' => 'image',
        'media_url' => 'https://picsum.photos/800/600',
        'order_index' => 0,
        'duration' => 5000,
    ])->assertStatus(201)->assertJsonFragment(['media_type' => 'image']);

    expect($this->story->fresh()->frame_count)->toBe(1);
});

it('enforces 100 frame limit', function (): void {
    $this->story->update(['frame_count' => 100]);

    $this->postJson("/api/stories/{$this->story->id}/frames", [
        'media_type' => 'image',
        'media_url' => 'https://example.com/img.jpg',
        'order_index' => 100,
    ])->assertStatus(422)->assertJsonFragment(['message' => 'Maximum of 100 frames per story reached.']);
});

it('updates a frame', function (): void {
    $frame = Frame::factory()->create(['story_id' => $this->story->id, 'order_index' => 0]);

    $this->putJson("/api/frames/{$frame->id}", ['text_content' => 'Hello world'])
        ->assertSuccessful()
        ->assertJsonFragment(['text_content' => 'Hello world']);
});

it('deletes a frame', function (): void {
    $frame = Frame::factory()->create(['story_id' => $this->story->id, 'order_index' => 0]);
    $this->story->update(['frame_count' => 1]);

    $this->deleteJson("/api/frames/{$frame->id}")->assertStatus(204);
    expect(Frame::find($frame->id))->toBeNull();
    expect($this->story->fresh()->frame_count)->toBe(0);
});

it('denies editing another user frame', function (): void {
    $other = User::factory()->create();
    $otherStory = Story::factory()->create(['user_id' => $other->id]);
    $frame = Frame::factory()->create(['story_id' => $otherStory->id, 'order_index' => 0]);

    $this->putJson("/api/frames/{$frame->id}", ['text_content' => 'Hacked'])->assertForbidden();
});
