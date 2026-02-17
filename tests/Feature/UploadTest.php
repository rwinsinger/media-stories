<?php

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;

uses(RefreshDatabase::class);

beforeEach(function (): void {
    $this->user = User::factory()->create();
    $this->actingAs($this->user);
    Storage::fake('media');
});

it('rejects upload when not authenticated', function (): void {
    auth()->logout();
    $this->postJson('/api/upload')->assertUnauthorized();
});

it('requires a file field', function (): void {
    $this->postJson('/api/upload')->assertUnprocessable();
});
