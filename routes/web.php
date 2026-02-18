<?php

use App\Http\Controllers\ShareLinkController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

// Story routes
Route::middleware(['auth', 'verified'])->group(function (): void {
    Route::get('story/new', fn () => Inertia::render('story/create'))->name('story.create');
    Route::get('story/{story}/edit', fn ($story) => Inertia::render('story/edit', ['storyId' => $story]))->name('story.edit');
    Route::get('story/{story}/view', fn ($story) => Inertia::render('story/show', ['storyId' => $story]))->name('story.show');

    // Friends routes
    Route::get('friends', fn () => Inertia::render('friends/index'))->name('friends.index');
    Route::get('friends/{id}/stories', fn ($id) => Inertia::render('friends/stories', ['friendId' => $id]))->name('friends.stories');

    // Shared stories
    Route::get('shared-stories', fn () => Inertia::render('shared-stories/index'))->name('shared-stories.index');

    // Subscription
    Route::get('subscription', fn () => Inertia::render('subscription/index'))->name('subscription.index');

    // Admin routes
    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/', fn () => Inertia::render('admin/analytics'))->name('admin.index');
        Route::get('users', fn () => Inertia::render('admin/users'))->name('admin.users');
        Route::get('users/{user}', fn ($user) => Inertia::render('admin/users/show', ['userId' => $user]))->name('admin.users.show');
        Route::get('analytics', fn () => Inertia::render('admin/analytics'))->name('admin.analytics');
        Route::get('logs', fn () => Inertia::render('admin/logs'))->name('admin.logs');
        Route::get('features', fn () => Inertia::render('admin/features'))->name('admin.features');
        Route::get('config', fn () => Inertia::render('admin/config'))->name('admin.config');
        Route::get('stories', fn () => Inertia::render('admin/stories'))->name('admin.stories');
        Route::get('moderation', fn () => Inertia::render('admin/moderation'))->name('admin.moderation');
    });
});

// Public share link viewer
Route::get('share/{token}', [ShareLinkController::class, 'show'])->name('share.show');

require __DIR__.'/settings.php';
