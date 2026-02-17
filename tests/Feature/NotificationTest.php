<?php

use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
});

it('lists user notifications', function (): void {
    Notification::factory()->count(3)->create(['user_id' => $this->user->id]);
    Notification::factory()->create(['user_id' => User::factory()->create()->id]);

    $this->getJson('/api/notifications')
        ->assertSuccessful()
        ->assertJsonCount(3);
});

it('marks all notifications as read', function (): void {
    Notification::factory()->count(3)->create(['user_id' => $this->user->id, 'is_read' => false]);

    $this->patchJson('/api/notifications')->assertSuccessful();

    expect(
        Notification::where('user_id', $this->user->id)->where('is_read', false)->count()
    )->toBe(0);
});

it('deletes a notification', function (): void {
    $notification = Notification::factory()->create(['user_id' => $this->user->id]);

    $this->deleteJson("/api/notifications/{$notification->id}")->assertStatus(204);
    expect(Notification::find($notification->id))->toBeNull();
});

it('cannot delete another user notification', function (): void {
    $other = User::factory()->create();
    $notification = Notification::factory()->create(['user_id' => $other->id]);

    $this->deleteJson("/api/notifications/{$notification->id}")->assertForbidden();
});
