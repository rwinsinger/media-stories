<?php

use App\Models\Story;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->admin = User::factory()->create(['is_admin' => true]);
    $this->actingAs($this->admin);
});

it('lists flagged stories', function (): void {
    Story::factory()->flagged()->count(2)->create();
    Story::factory()->create(['is_flagged' => false]);

    $response = $this->getJson('/api/admin/moderation')->assertSuccessful();

    foreach ($response->json('data') as $story) {
        expect($story['is_flagged'])->toBeTrue();
    }
});

it('denies non-admin access to moderation', function (): void {
    $this->actingAs(User::factory()->create(['is_admin' => false]));

    $this->getJson('/api/admin/moderation')->assertForbidden();
});

it('unflags a story', function (): void {
    $owner = User::factory()->create();
    $story = Story::factory()->flagged()->create(['user_id' => $owner->id]);

    $this->putJson("/api/admin/moderation/{$story->id}", ['action' => 'unflag'])
        ->assertSuccessful()
        ->assertJsonFragment(['is_flagged' => false]);

    expect($story->fresh()->is_flagged)->toBeFalse();
    expect($story->fresh()->flagged_reason)->toBeNull();
});

it('deletes a flagged story', function (): void {
    $owner = User::factory()->create();
    $story = Story::factory()->flagged()->create(['user_id' => $owner->id]);

    $this->putJson("/api/admin/moderation/{$story->id}", ['action' => 'delete'])
        ->assertStatus(204);

    expect(Story::find($story->id))->toBeNull();
});

it('rejects invalid moderation action', function (): void {
    $story = Story::factory()->flagged()->create();

    $this->putJson("/api/admin/moderation/{$story->id}", ['action' => 'invalid'])
        ->assertUnprocessable();
});
