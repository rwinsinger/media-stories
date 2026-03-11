<?php

use App\Mail\InvitationMail;
use App\Models\Friendship;
use App\Models\Invitation;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
    Mail::fake();
});

// --- store ---

it('sends an invitation to a non-registered email', function (): void {
    $this->postJson('/api/invitations', ['email' => 'newperson@example.com'])
        ->assertStatus(201)
        ->assertJsonFragment(['message' => 'Invitation sent.']);

    expect(Invitation::query()->where('email', 'newperson@example.com')->exists())->toBeTrue();
    Mail::assertQueued(InvitationMail::class, fn ($mail) => $mail->hasTo('newperson@example.com'));
});

it('rejects invitation to an already-registered email', function (): void {
    $registered = User::factory()->create(['email' => 'existing@example.com']);

    $this->postJson('/api/invitations', ['email' => $registered->email])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

it('rejects duplicate pending invitation from same user', function (): void {
    Invitation::factory()->create([
        'invited_by' => $this->user->id,
        'email' => 'pending@example.com',
        'expires_at' => now()->addHours(72),
    ]);

    $this->postJson('/api/invitations', ['email' => 'pending@example.com'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

it('allows re-inviting after a previous invitation expired', function (): void {
    Invitation::factory()->create([
        'invited_by' => $this->user->id,
        'email' => 'expired@example.com',
        'expires_at' => now()->subHour(),
    ]);

    $this->postJson('/api/invitations', ['email' => 'expired@example.com'])
        ->assertStatus(201);
});

it('requires a valid email', function (): void {
    $this->postJson('/api/invitations', ['email' => 'not-an-email'])
        ->assertStatus(422)
        ->assertJsonValidationErrors(['email']);
});

it('requires authentication to send invitation', function (): void {
    auth()->logout();
    $this->postJson('/api/invitations', ['email' => 'someone@example.com'])
        ->assertStatus(401);
});

// --- show ---

it('shows the invite landing page for a valid token', function (): void {
    $invitation = Invitation::factory()->create([
        'invited_by' => $this->user->id,
        'email' => 'invitee@example.com',
        'expires_at' => now()->addHours(72),
    ]);

    $this->get("/invite/{$invitation->token}")
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('invite/show')
            ->where('inviter_name', $this->user->name)
            ->where('expired', false)
        );
});

it('shows expired state for expired invitation token', function (): void {
    $invitation = Invitation::factory()->create([
        'invited_by' => $this->user->id,
        'email' => 'invitee@example.com',
        'expires_at' => now()->subHour(),
    ]);

    $this->get("/invite/{$invitation->token}")
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('invite/show')
            ->where('expired', true)
        );
});

it('shows invalid state for an unknown token', function (): void {
    $this->get('/invite/nonexistent-token')
        ->assertSuccessful()
        ->assertInertia(fn ($page) => $page
            ->component('invite/show')
            ->where('inviter_name', null)
            ->where('expired', true)
        );
});

// --- accept ---

it('allows a logged-in user to accept an invitation', function (): void {
    $inviter = User::factory()->create();
    $invitation = Invitation::factory()->create([
        'invited_by' => $inviter->id,
        'email' => $this->user->email,
        'expires_at' => now()->addHours(72),
    ]);

    $this->postJson("/api/invitations/{$invitation->token}/accept")
        ->assertSuccessful()
        ->assertJsonFragment(['message' => 'Invitation accepted.']);

    expect(Friendship::query()
        ->where('requester_id', $inviter->id)
        ->where('addressee_id', $this->user->id)
        ->where('status', 'accepted')
        ->exists()
    )->toBeTrue();

    expect($invitation->fresh()->accepted_at)->not->toBeNull();
});

it('returns 404 for accept on expired invitation', function (): void {
    $invitation = Invitation::factory()->create([
        'invited_by' => $this->user->id,
        'email' => 'someone@example.com',
        'expires_at' => now()->subHour(),
    ]);

    $other = User::factory()->create();
    $this->actingAs($other)
        ->postJson("/api/invitations/{$invitation->token}/accept")
        ->assertNotFound();
});

// --- auto-friendship on registration ---

it('creates friendship when invited user registers', function (): void {
    $inviter = User::factory()->create();
    $inviteeEmail = 'brandnew@example.com';

    Invitation::factory()->create([
        'invited_by' => $inviter->id,
        'email' => $inviteeEmail,
        'expires_at' => now()->addHours(72),
    ]);

    $newUser = User::factory()->make(['email' => $inviteeEmail]);
    $newUser->save();

    event(new Registered($newUser));

    expect(Friendship::query()
        ->where('requester_id', $inviter->id)
        ->where('addressee_id', $newUser->id)
        ->where('status', 'accepted')
        ->exists()
    )->toBeTrue();

    expect(Invitation::query()->where('email', $inviteeEmail)->first()->accepted_at)->not->toBeNull();
});

it('does not create duplicate friendship on registration if already friends', function (): void {
    $inviter = User::factory()->create();
    $inviteeEmail = 'alreadyfriends@example.com';

    $invitation = Invitation::factory()->create([
        'invited_by' => $inviter->id,
        'email' => $inviteeEmail,
        'expires_at' => now()->addHours(72),
    ]);

    $newUser = User::factory()->make(['email' => $inviteeEmail]);
    $newUser->save();

    Friendship::factory()->accepted()->create([
        'requester_id' => $inviter->id,
        'addressee_id' => $newUser->id,
    ]);

    event(new Registered($newUser));

    expect(Friendship::query()
        ->where('requester_id', $inviter->id)
        ->where('addressee_id', $newUser->id)
        ->count()
    )->toBe(1);
});
