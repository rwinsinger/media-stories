<?php

use App\Models\Friendship;
use App\Models\Story;
use App\Models\StoryShare;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create(['subscription_tier' => 'free']);
    $this->friend = User::factory()->create();
    $this->story = Story::factory()->published()->create(['user_id' => $this->user->id]);

    Friendship::factory()->accepted()->create([
        'requester_id' => $this->user->id,
        'addressee_id' => $this->friend->id,
    ]);

    $this->actingAs($this->user);
});

it('lists story shares', function (): void {
    StoryShare::factory()->create([
        'story_id' => $this->story->id,
        'shared_by_user_id' => $this->user->id,
        'shared_with_user_id' => $this->friend->id,
    ]);

    $this->getJson('/api/story-shares')->assertSuccessful()->assertJsonCount(1);
});

it('shares a story with a friend', function (): void {
    $this->postJson('/api/story-shares', [
        'story_id' => $this->story->id,
        'shared_with_user_id' => $this->friend->id,
        'permission_level' => 'view',
    ])->assertStatus(201)->assertJsonFragment(['permission_level' => 'view']);
});

it('cannot share with non-friend', function (): void {
    $stranger = User::factory()->create();

    $this->postJson('/api/story-shares', [
        'story_id' => $this->story->id,
        'shared_with_user_id' => $stranger->id,
        'permission_level' => 'view',
    ])->assertStatus(422);
});

it('enforces free share limit', function (): void {
    $friends = User::factory()->count(3)->create();

    foreach ($friends as $i => $friend) {
        Friendship::factory()->accepted()->create([
            'requester_id' => $this->user->id,
            'addressee_id' => $friend->id,
        ]);
        StoryShare::factory()->create([
            'story_id' => $this->story->id,
            'shared_by_user_id' => $this->user->id,
            'shared_with_user_id' => $friend->id,
        ]);
    }

    $newFriend = User::factory()->create();
    Friendship::factory()->accepted()->create([
        'requester_id' => $this->user->id,
        'addressee_id' => $newFriend->id,
    ]);

    $this->postJson('/api/story-shares', [
        'story_id' => $this->story->id,
        'shared_with_user_id' => $newFriend->id,
    ])->assertStatus(422)->assertJsonFragment(['message' => 'Share limit reached for your subscription tier.']);
});

it('revokes a share', function (): void {
    $share = StoryShare::factory()->create([
        'story_id' => $this->story->id,
        'shared_by_user_id' => $this->user->id,
        'shared_with_user_id' => $this->friend->id,
    ]);

    $this->deleteJson("/api/story-shares/{$share->id}")->assertStatus(204);
    expect($share->fresh()->is_revoked)->toBeTrue();
});

it('tracks a view', function (): void {
    $share = StoryShare::factory()->create([
        'story_id' => $this->story->id,
        'shared_by_user_id' => $this->user->id,
        'shared_with_user_id' => $this->friend->id,
    ]);

    $this->actingAs($this->friend)->patchJson("/api/story-shares/{$share->id}/view")->assertSuccessful();
    expect($share->fresh()->view_count)->toBe(1);
});
