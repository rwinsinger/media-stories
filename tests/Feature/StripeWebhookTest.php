<?php

use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('rejects webhook with invalid signature', function (): void {
    $this->postJson('/api/stripe/webhook', [], ['Stripe-Signature' => 'invalid'])
        ->assertStatus(400);
});
