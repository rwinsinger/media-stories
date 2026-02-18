<?php

use App\Http\Controllers\ActivityLogController;
use App\Http\Controllers\Admin\AnalyticsController;
use App\Http\Controllers\Admin\ConfigController;
use App\Http\Controllers\Admin\FeatureController;
use App\Http\Controllers\Admin\LogController;
use App\Http\Controllers\Admin\ModerationController;
use App\Http\Controllers\Admin\StoryController as AdminStoryController;
use App\Http\Controllers\Admin\UserController as AdminUserController;
use App\Http\Controllers\FrameController;
use App\Http\Controllers\FriendController;
use App\Http\Controllers\ImageProcessorController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\ShareLinkController;
use App\Http\Controllers\StoryController;
use App\Http\Controllers\StoryShareController;
use App\Http\Controllers\StripeController;
use App\Http\Controllers\StripeWebhookController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/stripe/webhook', [StripeWebhookController::class, 'handle'])->name('stripe.webhook');

// Authenticated routes
Route::middleware(['auth', 'verified'])->group(function (): void {
    // Stories
    Route::get('/stories', [StoryController::class, 'index']);
    Route::post('/stories', [StoryController::class, 'store']);
    Route::get('/stories/{story}', [StoryController::class, 'show']);
    Route::put('/stories/{story}', [StoryController::class, 'update']);
    Route::delete('/stories/{story}', [StoryController::class, 'destroy']);
    Route::post('/stories/{story}/flag', [StoryController::class, 'flag']);

    // Frames
    Route::get('/stories/{story}/frames', [FrameController::class, 'index']);
    Route::post('/stories/{story}/frames', [FrameController::class, 'store']);
    Route::get('/frames/{frame}', [FrameController::class, 'show']);
    Route::put('/frames/{frame}', [FrameController::class, 'update']);
    Route::delete('/frames/{frame}', [FrameController::class, 'destroy']);

    // Friends
    Route::get('/friends/search', [FriendController::class, 'search']);
    Route::get('/friends', [FriendController::class, 'index']);
    Route::post('/friends', [FriendController::class, 'store'])->middleware('throttle:friend-requests');
    Route::put('/friends/{friendship}', [FriendController::class, 'update']);
    Route::delete('/friends/{friendship}', [FriendController::class, 'destroy']);

    // Story Shares
    Route::get('/story-shares', [StoryShareController::class, 'index']);
    Route::post('/story-shares', [StoryShareController::class, 'store']);
    Route::delete('/story-shares/{storyShare}', [StoryShareController::class, 'destroy']);
    Route::patch('/story-shares/{storyShare}/view', [StoryShareController::class, 'trackView']);

    // Notifications
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications', [NotificationController::class, 'markAllRead']);
    Route::delete('/notifications/{notification}', [NotificationController::class, 'destroy']);

    // Share Links
    Route::post('/share-links', [ShareLinkController::class, 'store']);

    // Uploads
    Route::post('/upload', [UploadController::class, 'store']);
    Route::post('/process-image', [ImageProcessorController::class, 'process']);

    // Activity
    Route::get('/activity', [ActivityLogController::class, 'index']);

    // Stripe
    Route::post('/stripe/checkout', [StripeController::class, 'checkout']);
    Route::post('/stripe/portal', [StripeController::class, 'portal']);

    // Admin routes
    Route::middleware('admin')->prefix('admin')->group(function (): void {
        Route::get('/users', [AdminUserController::class, 'index']);
        Route::get('/users/{user}', [AdminUserController::class, 'show']);
        Route::put('/users/{user}', [AdminUserController::class, 'update']);
        Route::get('/analytics', [AnalyticsController::class, 'index']);
        Route::get('/logs', [LogController::class, 'index']);
        Route::get('/features', [FeatureController::class, 'index']);
        Route::put('/features/{key}', [FeatureController::class, 'update']);
        Route::get('/config', [ConfigController::class, 'index']);
        Route::put('/config', [ConfigController::class, 'update']);
        Route::get('/stories', [AdminStoryController::class, 'index']);
        Route::put('/stories/{story}', [AdminStoryController::class, 'update']);
        Route::delete('/stories/{story}', [AdminStoryController::class, 'destroy']);
        Route::get('/moderation', [ModerationController::class, 'index']);
        Route::put('/moderation/{story}', [ModerationController::class, 'update']);
    });
});
