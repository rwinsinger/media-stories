# Media Stories — Conversion Guide

> **From:** Next.js 16 + Supabase + Stripe
> **To:** React (Inertia.js) + Laravel 12 + SQLite (local) / MySQL (prod) + Stripe

---

## Table of Contents

1. [Tech Stack Mapping](#1-tech-stack-mapping)
2. [Database Schema & Migrations](#2-database-schema--migrations)
3. [Authentication](#3-authentication)
4. [API Endpoints → Laravel Controllers](#4-api-endpoints--laravel-controllers)
5. [Business Logic & Subscription Limits](#5-business-logic--subscription-limits)
6. [Frontend Components & Pages](#6-frontend-components--pages)
7. [File Storage](#7-file-storage)
8. [Stripe Integration](#8-stripe-integration)
9. [Security](#9-security)
10. [Admin System](#10-admin-system)
11. [Configuration & Feature Flags](#11-configuration--feature-flags)
12. [Testing](#12-testing)
13. [Seed Data](#13-seed-data)
14. [Environment Variables](#14-environment-variables)

---

## 1. Tech Stack Mapping

| Original (Next.js) | New (Laravel) |
|---------------------|---------------|
| Next.js 16 App Router | Laravel 12 + Inertia v2 + React |
| Supabase Auth (JWT cookies) | Laravel Fortify (session-based) |
| Supabase PostgreSQL | SQLite (local) / MySQL (prod) |
| Supabase Storage (media bucket) | Laravel Filesystem (local/S3 disk) |
| Supabase RLS Policies | Laravel Policies & Gates |
| Next.js API Routes | Laravel Controllers |
| Zod validation | Laravel Form Requests |
| next-pwa | Vite PWA plugin (optional) |
| @dnd-kit | @dnd-kit (keep as-is) |
| recharts | recharts (keep as-is) |
| sharp (image processing) | Intervention Image or Spatie Media Library |
| qrcode | chillerlan/php-qrcode or JS-side qrcode |
| Tailwind CSS 4 | Tailwind CSS 4 (keep as-is) |
| Stripe JS SDK | Laravel Cashier or direct Stripe PHP SDK |

---

## 2. Database Schema & Migrations

### Enums (use string columns with validation, or PHP Enums)

```php
// app/Enums/SubscriptionTier.php
enum SubscriptionTier: string {
    case Free = 'free';
    case Premium = 'premium';
}

// app/Enums/SubscriptionStatus.php
enum SubscriptionStatus: string {
    case Active = 'active';
    case Cancelled = 'cancelled';
    case Expired = 'expired';
}

// app/Enums/ActionCategory.php
enum ActionCategory: string {
    case Auth = 'auth';
    case Story = 'story';
    case User = 'user';
    case Admin = 'admin';
    case Subscription = 'subscription';
    case Share = 'share';
}

// app/Enums/MediaType.php
enum MediaType: string {
    case Image = 'image';
    case Video = 'video';
}

// app/Enums/FriendshipStatus.php
enum FriendshipStatus: string {
    case Pending = 'pending';
    case Accepted = 'accepted';
    case Declined = 'declined';
    case Blocked = 'blocked';
}

// app/Enums/NotificationType.php
enum NotificationType: string {
    case FriendRequest = 'friend_request';
    case FriendAccepted = 'friend_accepted';
    case StoryShared = 'story_shared';
    case StoryComment = 'story_comment';
}

// app/Enums/PermissionLevel.php
enum PermissionLevel: string {
    case View = 'view';
    case Comment = 'comment';
}
```

### Migration: Users Table

> Laravel's built-in `users` table already provides `id`, `email`, `password`, `created_at`, `updated_at`. Extend it with the additional columns.

```php
// Additional columns for users table
Schema::table('users', function (Blueprint $table) {
    $table->string('subscription_tier')->default('free');        // free | premium
    $table->string('subscription_id')->nullable();               // Stripe subscription ID
    $table->string('subscription_status')->default('active');    // active | cancelled | expired
    $table->unsignedInteger('story_count')->default(0);
    $table->boolean('is_admin')->default(false);
    $table->boolean('is_suspended')->default(false);
    $table->text('suspended_reason')->nullable();
    $table->timestamp('last_login_at')->nullable();
    $table->json('settings')->nullable();                        // User preferences JSON
});
```

### Migration: Stories Table

```php
Schema::create('stories', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title');
    $table->text('description')->nullable();
    $table->boolean('is_published')->default(false);
    $table->boolean('is_featured')->default(false);
    $table->boolean('is_flagged')->default(false);
    $table->text('flagged_reason')->nullable();
    $table->unsignedInteger('frame_count')->default(0);
    $table->unsignedInteger('view_count')->default(0);
    $table->json('settings')->nullable();
    $table->timestamps();

    $table->index('user_id');
    $table->index('is_published');
    $table->index('is_featured');
    $table->index('is_flagged');
});
```

### Migration: Frames Table

```php
Schema::create('frames', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('order_index');
    $table->string('media_type');               // image | video
    $table->string('media_url');                // Storage path
    $table->string('thumbnail_url')->nullable();
    $table->text('text_content')->nullable();   // Overlay text
    $table->string('audio_url')->nullable();
    $table->unsignedInteger('duration')->default(5000); // ms
    $table->json('settings')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->unique(['story_id', 'order_index']);
    $table->index('story_id');
    $table->index(['story_id', 'order_index']);
});
```

### Migration: Share Links Table

```php
Schema::create('share_links', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
    $table->string('token')->unique();
    $table->timestamp('expires_at');
    $table->unsignedInteger('view_count')->default(0);
    $table->unsignedInteger('max_views')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->index('token');
    $table->index('story_id');
});
```

### Migration: Friendships Table

```php
Schema::create('friendships', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('addressee_id')->constrained('users')->cascadeOnDelete();
    $table->string('status')->default('pending'); // pending | accepted | declined | blocked
    $table->timestamp('requested_at')->useCurrent();
    $table->timestamp('responded_at')->nullable();
    $table->timestamps();

    $table->unique(['requester_id', 'addressee_id']);
    $table->index(['requester_id', 'status']);
    $table->index(['addressee_id', 'status']);
    $table->index(['requester_id', 'addressee_id', 'status']);
    $table->index(['addressee_id', 'requester_id', 'status']);

    // CHECK: requester_id != addressee_id (enforce in model/form request)
});
```

### Migration: Story Shares Table

```php
Schema::create('story_shares', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
    $table->foreignId('shared_by_user_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('shared_with_user_id')->constrained('users')->cascadeOnDelete();
    $table->string('permission_level')->default('view'); // view | comment
    $table->timestamp('shared_at')->useCurrent();
    $table->timestamp('expires_at')->nullable();
    $table->unsignedInteger('view_count')->default(0);
    $table->timestamp('last_viewed_at')->nullable();
    $table->boolean('is_revoked')->default(false);
    $table->timestamp('revoked_at')->nullable();
    $table->text('message')->nullable();

    $table->unique(['story_id', 'shared_with_user_id']);

    // Partial indexes (use standard indexes; filter in queries)
    $table->index('story_id');
    $table->index(['shared_with_user_id', 'is_revoked']);
    $table->index(['shared_by_user_id', 'is_revoked']);
    $table->index('expires_at');

    // CHECK: shared_by_user_id != shared_with_user_id (enforce in model/form request)
});
```

### Migration: Notifications Table

```php
Schema::create('notifications', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type');             // friend_request | friend_accepted | story_shared | story_comment
    $table->string('title');
    $table->text('message');
    $table->string('link_url')->nullable();
    $table->boolean('is_read')->default(false);
    $table->timestamp('read_at')->nullable();
    $table->string('resource_type')->nullable();
    $table->uuid('resource_id')->nullable();
    $table->foreignId('sender_id')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('created_at')->useCurrent();

    $table->index(['user_id', 'is_read', 'created_at']);
    $table->index(['user_id', 'is_read']);
    $table->index('created_at');
});
```

### Migration: Activity Logs Table

```php
Schema::create('activity_logs', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('action');
    $table->string('action_category');    // auth | story | user | admin | subscription | share
    $table->string('resource_type')->nullable();
    $table->string('resource_id')->nullable();
    $table->json('details')->nullable();
    $table->string('ip_address')->nullable();
    $table->text('user_agent')->nullable();
    $table->boolean('is_admin_action')->default(false);
    $table->foreignId('target_user_id')->nullable()->constrained('users')->nullOnDelete();
    $table->timestamp('created_at')->useCurrent();

    $table->index('user_id');
    $table->index('created_at');
    $table->index('action_category');
    $table->index('is_admin_action');
    $table->index('target_user_id');
});
```

### Migration: Config Table

```php
Schema::create('config', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->json('value');
    $table->timestamp('updated_at')->useCurrent();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
});
```

### Migration: Feature Flags Table

```php
Schema::create('feature_flags', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->boolean('enabled')->default(false);
    $table->text('description')->nullable();
    $table->unsignedTinyInteger('rollout_percentage')->default(0);
    $table->timestamp('updated_at')->useCurrent();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
});
```

### Database Triggers → Laravel Observers/Events

| Original Trigger | Laravel Equivalent |
|------------------|-------------------|
| Auto-create user profile on auth signup | Not needed (single `users` table) |
| Auto-update `updated_at` | Built-in with `$table->timestamps()` |
| Sync `stories.frame_count` on frame insert/delete | `FrameObserver::created()` / `deleted()` → `$story->updateFrameCount()` |
| `increment_story_views()` function | `Story::incrementViewCount()` method or `Story::query()->increment('view_count')` |

---

## 3. Authentication

### Supabase Auth → Laravel Fortify

| Feature | Original | Laravel |
|---------|----------|---------|
| Signup | Supabase `auth.signUp()` | Fortify registration (POST `/register`) |
| Login | Supabase `auth.signInWithPassword()` | Fortify login (POST `/login`) |
| Logout | Supabase `auth.signOut()` | POST `/logout` |
| Session | JWT in cookies | Laravel session (cookies) |
| Password reset | Supabase built-in | Fortify password reset |
| Email verification | Supabase built-in | Fortify email verification |
| Admin check | `users.is_admin` column | `$user->is_admin` with Gate/middleware |

### Middleware

```php
// bootstrap/app.php
->withMiddleware(function (Middleware $middleware) {
    $middleware->web(append: [
        \App\Http\Middleware\TrackLastLogin::class,
        \App\Http\Middleware\CheckSuspended::class,
    ]);

    $middleware->alias([
        'admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
        'subscription' => \App\Http\Middleware\EnsureSubscription::class,
    ]);
})
```

### Guard Components → Inertia Middleware

| Original | Laravel |
|----------|---------|
| `<ProtectedRoute>` | `auth` middleware on routes |
| `<AdminGuard>` | `admin` middleware on routes |
| `<SubscriptionGuard>` | `subscription:premium` middleware |

---

## 4. API Endpoints → Laravel Controllers

### Route Definitions

```php
// routes/web.php (Inertia pages)
Route::middleware('auth')->group(function () {
    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');
    Route::get('/settings', [SettingsController::class, 'index'])->name('settings');
    Route::get('/subscription', [SubscriptionController::class, 'index'])->name('subscription');
    Route::get('/friends', [FriendController::class, 'index'])->name('friends.index');
    Route::get('/friends/{friend}/stories', [FriendController::class, 'stories'])->name('friends.stories');
    Route::get('/shared-stories', [SharedStoryController::class, 'index'])->name('shared-stories.index');
    Route::get('/story/new', [StoryController::class, 'create'])->name('stories.create');
    Route::get('/story/{story}/edit', [StoryController::class, 'edit'])->name('stories.edit');
    Route::get('/story/{story}/view', [StoryController::class, 'show'])->name('stories.show');

    // Admin routes
    Route::middleware('admin')->prefix('admin')->name('admin.')->group(function () {
        Route::get('/users', [Admin\UserController::class, 'index'])->name('users.index');
        Route::get('/users/{user}', [Admin\UserController::class, 'show'])->name('users.show');
        Route::get('/analytics', [Admin\AnalyticsController::class, 'index'])->name('analytics');
        Route::get('/logs', [Admin\LogController::class, 'index'])->name('logs');
        Route::get('/features', [Admin\FeatureController::class, 'index'])->name('features');
        Route::get('/config', [Admin\ConfigController::class, 'index'])->name('config');
        Route::get('/stories', [Admin\StoryController::class, 'index'])->name('stories');
        Route::get('/moderation', [Admin\ModerationController::class, 'index'])->name('moderation');
    });
});

// Public share link (no auth required)
Route::get('/share/{token}', [ShareLinkController::class, 'show'])->name('share.show');
```

```php
// routes/api.php (JSON endpoints, called from React via fetch/axios)
Route::middleware('auth:sanctum')->group(function () {
    // Stories
    Route::apiResource('stories', StoryController::class);
    Route::post('stories/{story}/flag', [StoryController::class, 'flag']);

    // Frames
    Route::apiResource('stories.frames', FrameController::class)->shallow();

    // Friends
    Route::get('friends/search', [FriendController::class, 'search']);
    Route::apiResource('friends', FriendController::class)->except(['show', 'edit', 'create']);

    // Story Shares
    Route::apiResource('story-shares', StoryShareController::class)->except(['show', 'edit', 'create']);
    Route::patch('story-shares/{storyShare}/view', [StoryShareController::class, 'trackView']);

    // Notifications
    Route::get('notifications', [NotificationController::class, 'index']);
    Route::patch('notifications', [NotificationController::class, 'markAllRead']);
    Route::delete('notifications/{notification}', [NotificationController::class, 'destroy']);

    // Share Links
    Route::post('share-links', [ShareLinkController::class, 'store']);

    // Upload
    Route::post('upload', [UploadController::class, 'store']);
    Route::post('process-image', [ImageProcessorController::class, 'process']);

    // Activity
    Route::get('activity', [ActivityLogController::class, 'index']);

    // Stripe
    Route::post('stripe/checkout', [StripeController::class, 'checkout']);
    Route::post('stripe/portal', [StripeController::class, 'portal']);

    // Admin API
    Route::middleware('admin')->prefix('admin')->group(function () {
        Route::put('users/{user}', [Admin\UserController::class, 'update']);
        Route::apiResource('features', Admin\FeatureController::class)->except(['destroy']);
        Route::put('config', [Admin\ConfigController::class, 'update']);
        Route::put('stories/{story}', [Admin\StoryController::class, 'update']);
        Route::delete('stories/{story}', [Admin\StoryController::class, 'destroy']);
        Route::put('moderation/{story}', [Admin\ModerationController::class, 'update']);
    });
});

// Stripe Webhook (no auth, uses signature verification)
Route::post('stripe/webhook', [StripeWebhookController::class, 'handle']);
```

### Controller → Endpoint Mapping (31 endpoints)

| # | Method | Endpoint | Controller Method |
|---|--------|----------|-------------------|
| 1 | GET | `/api/stories` | `StoryController@index` |
| 2 | POST | `/api/stories` | `StoryController@store` |
| 3 | GET | `/api/stories/{story}` | `StoryController@show` |
| 4 | PUT | `/api/stories/{story}` | `StoryController@update` |
| 5 | DELETE | `/api/stories/{story}` | `StoryController@destroy` |
| 6 | POST | `/api/stories/{story}/flag` | `StoryController@flag` |
| 7 | GET | `/api/stories/{story}/frames` | `FrameController@index` |
| 8 | POST | `/api/stories/{story}/frames` | `FrameController@store` |
| 9 | GET | `/api/frames/{frame}` | `FrameController@show` |
| 10 | PUT | `/api/frames/{frame}` | `FrameController@update` |
| 11 | DELETE | `/api/frames/{frame}` | `FrameController@destroy` |
| 12 | GET | `/api/friends` | `FriendController@index` |
| 13 | POST | `/api/friends` | `FriendController@store` |
| 14 | PUT | `/api/friends/{friend}` | `FriendController@update` |
| 15 | DELETE | `/api/friends/{friend}` | `FriendController@destroy` |
| 16 | GET | `/api/friends/search` | `FriendController@search` |
| 17 | GET | `/api/story-shares` | `StoryShareController@index` |
| 18 | POST | `/api/story-shares` | `StoryShareController@store` |
| 19 | DELETE | `/api/story-shares/{storyShare}` | `StoryShareController@destroy` |
| 20 | PATCH | `/api/story-shares/{storyShare}/view` | `StoryShareController@trackView` |
| 21 | GET | `/api/notifications` | `NotificationController@index` |
| 22 | PATCH | `/api/notifications` | `NotificationController@markAllRead` |
| 23 | DELETE | `/api/notifications/{notification}` | `NotificationController@destroy` |
| 24 | POST | `/api/share-links` | `ShareLinkController@store` |
| 25 | GET | `/share/{token}` | `ShareLinkController@show` |
| 26 | POST | `/api/upload` | `UploadController@store` |
| 27 | POST | `/api/process-image` | `ImageProcessorController@process` |
| 28 | GET | `/api/activity` | `ActivityLogController@index` |
| 29 | POST | `/api/stripe/checkout` | `StripeController@checkout` |
| 30 | POST | `/api/stripe/portal` | `StripeController@portal` |
| 31 | POST | `/api/stripe/webhook` | `StripeWebhookController@handle` |

### Admin Endpoints

| # | Method | Endpoint | Controller Method |
|---|--------|----------|-------------------|
| 32 | GET | `/api/admin/users` | `Admin\UserController@index` (paginated, filterable) |
| 33 | PUT | `/api/admin/users/{user}` | `Admin\UserController@update` (suspend, set admin, etc.) |
| 34 | GET | `/api/admin/analytics` | `Admin\AnalyticsController@index` |
| 35 | GET | `/api/admin/logs` | `Admin\LogController@index` |
| 36 | GET | `/api/admin/features` | `Admin\FeatureController@index` |
| 37 | PUT | `/api/admin/features/{key}` | `Admin\FeatureController@update` |
| 38 | GET | `/api/admin/config` | `Admin\ConfigController@index` |
| 39 | PUT | `/api/admin/config` | `Admin\ConfigController@update` |
| 40 | GET | `/api/admin/stories` | `Admin\StoryController@index` |
| 41 | PUT | `/api/admin/stories/{story}` | `Admin\StoryController@update` |
| 42 | DELETE | `/api/admin/stories/{story}` | `Admin\StoryController@destroy` |
| 43 | GET | `/api/admin/moderation` | `Admin\ModerationController@index` (flagged stories) |
| 44 | PUT | `/api/admin/moderation/{story}` | `Admin\ModerationController@update` |

---

## 5. Business Logic & Subscription Limits

### Subscription Tiers

| Feature | Free | Premium ($9/mo) |
|---------|------|-----------------|
| Max stories | 5 | Unlimited |
| Max friends | 10 | 500 |
| Max shares per story | 3 | 50 |
| Friend requests per hour | 10 | 50 |
| Max frames per story | 100 | 100 |
| Share link duration | 72 hours | 72 hours |
| Max image size | 10 MB | 10 MB |
| Max video size | 100 MB | 100 MB |
| Default frame duration | 5000 ms | 5000 ms |

### Validation Rules (Form Requests)

**StoreStoryRequest:**
- `title`: required, string, max:100
- `description`: nullable, string, max:500
- Custom: check story count against subscription limit

**UpdateStoryRequest:**
- `title`: sometimes, string, max:100
- `description`: nullable, string, max:500
- `is_published`: sometimes, boolean

**StoreFrameRequest:**
- `media_type`: required, in:image,video
- `media_url`: required, string (storage path)
- `text_content`: nullable, string, max:500
- `audio_url`: nullable, string
- `duration`: integer, min:1000, max:30000 (1-30 seconds, step 500)
- `order_index`: required, integer, min:0
- Custom: check frame count < 100

**StoreFriendRequest:**
- `addressee_id`: required, exists:users,id, not self
- Custom: rate limit (10/hr free, 50/hr premium), friend count limit

**StoreStoryShareRequest:**
- `story_id`: required, exists:stories,id, owned by user
- `shared_with_user_id`: required, exists:users,id, must be accepted friend
- `permission_level`: in:view,comment, default:view
- `message`: nullable, string, max:500
- `expires_in_days`: nullable, integer, min:1
- Custom: share count per story limit

**UploadRequest:**
- `file`: required, file
- Image: max 10MB, mimes:jpg,jpeg,png,gif,webp
- Video: max 100MB, mimes:mp4,webm,mov
- Audio: mimes:mp3,wav,ogg
- Custom: magic bytes validation (SSRF protection)

### Rate Limiting

```php
// bootstrap/app.php or RouteServiceProvider
RateLimiter::for('friend-requests', function (Request $request) {
    $limit = $request->user()->subscription_tier === 'premium' ? 50 : 10;
    return Limit::perHour($limit)->by($request->user()->id);
});
```

### Activity Logging

Log all mutations with:
- `user_id`, `action`, `action_category`, `resource_type`, `resource_id`
- `details` (JSON), `ip_address`, `user_agent`
- `is_admin_action`, `target_user_id`

Categories: `auth`, `story`, `user`, `admin`, `subscription`, `share`

Implement as a reusable service:

```php
// app/Services/ActivityLogger.php
class ActivityLogger
{
    public function log(
        string $action,
        ActionCategory $category,
        ?string $resourceType = null,
        ?string $resourceId = null,
        ?array $details = null,
        bool $isAdminAction = false,
        ?int $targetUserId = null,
    ): void { ... }
}
```

---

## 6. Frontend Components & Pages

### Pages (Inertia)

All pages live in `resources/js/pages/`. Each is rendered via `Inertia::render()`.

#### Authentication Pages

| Page | Route | Props | Key Behavior |
|------|-------|-------|-------------|
| `Auth/Login.tsx` | `/login` | errors | Email/password form, link to signup, loading states |
| `Auth/Register.tsx` | `/register` | errors | Email, password, confirm password (min 6 chars), ToS notice |
| `Welcome.tsx` | `/` | — | Hero section, 3 feature cards, pricing comparison, CTA buttons |

#### Dashboard & Stories

| Page | Route | Props | Key Behavior |
|------|-------|-------|-------------|
| `Dashboard.tsx` | `/dashboard` | user, stories, stats | Welcome header, 3 stat cards, stories grid (1/2/3 col responsive), create button, empty state |
| `Story/Create.tsx` | `/story/new` | — | Title (100 char max w/ counter), description (500 char max w/ counter), back link |
| `Story/Edit.tsx` | `/story/{id}/edit` | story, frames | 2/3 left col (details + frames), 1/3 sidebar (info + actions), published toggle, drag-and-drop frames, frame editor modal, share modals |
| `Story/Show.tsx` | `/story/{id}/view` | story, frames | Full-screen slideshow, shared-by indicator, auto-play/manual, keyboard/touch nav |

#### Friends

| Page | Route | Props | Key Behavior |
|------|-------|-------|-------------|
| `Friends/Index.tsx` | `/friends` | friends, requests, tab | 3 tabs (My Friends, Requests, Find Friends), friend cards grid, accept/decline/cancel, badge count, search |
| `Friends/Stories.tsx` | `/friends/{id}/stories` | friend, stories | Friend header, stories grid with share dates |

#### Sharing

| Page | Route | Props | Key Behavior |
|------|-------|-------|-------------|
| `SharedStories/Index.tsx` | `/shared-stories` | shares | List view, story icon, title, shared-by email, date, message, expiration warning (<24h) |
| `Share/Show.tsx` | `/share/{token}` | story, frames, shareLink | Public viewer (no auth), slideshow |

#### Settings & Subscription

| Page | Route | Props | Key Behavior |
|------|-------|-------|-------------|
| `Settings/Index.tsx` | `/settings` | user | Theme cards (Light/Dark/Auto), account info, password change, activity link |
| `Subscription/Index.tsx` | `/subscription` | user, plans | Current plan + status badge, usage indicator, manage/upgrade, pricing cards, FAQ (4 questions) |

#### Admin Pages

| Page | Route | Props |
|------|-------|-------|
| `Admin/Users.tsx` | `/admin/users` | users (paginated), filters |
| `Admin/Users/Show.tsx` | `/admin/users/{id}` | user, activity |
| `Admin/Analytics.tsx` | `/admin/analytics` | stats, charts (recharts) |
| `Admin/Logs.tsx` | `/admin/logs` | logs (paginated), filters |
| `Admin/Features.tsx` | `/admin/features` | flags |
| `Admin/Config.tsx` | `/admin/config` | config entries |
| `Admin/Stories.tsx` | `/admin/stories` | stories (paginated) |
| `Admin/Moderation.tsx` | `/admin/moderation` | flagged stories |

### Reusable UI Components (`resources/js/components/ui/`)

| Component | Props | Notes |
|-----------|-------|-------|
| `Button` | variant (primary\|secondary\|danger\|ghost), size (sm\|md\|lg), href, isLoading | Focus ring, disabled states |
| `Modal` | isOpen, onClose, title, children, footer, maxWidth | Responsive, scrollable, close button |
| `Alert` | type (error\|success\|info\|warning), message, children, onDismiss | Color-coded, optional close |
| `EmptyState` | icon, title, message, actionLabel, actionHref, onAction | — |
| `StatCard` | label, value, valueColor, subtitle | — |
| `Spinner` | size (sm\|md\|lg), label | Animated with optional text |
| `Navigation` | — | Sticky header, nav links, notification bell, mobile hamburger |

### Story Components (`resources/js/components/story/`)

| Component | Key Features |
|-----------|-------------|
| `StoryCard` | Link to edit, title, description (2-line clamp), published badge, frame/view counts, delete confirm |
| `Slideshow` | Full-screen, progress bar, image/video, nav arrows, progress dots, play/pause, mute, text toggle, fullscreen, keyboard (arrows/space/F/Esc), touch swipe, auto-play |
| `FrameEditor` | Media upload (required), edit image, text overlay (500 char), audio upload, duration slider (1-30s, 0.5s steps) |
| `FrameList` | Drag-and-drop (dnd-kit), drag handle, thumbnail, frame #, duration, text clamp, media type badge, audio indicator |
| `ImageEditor` | Canvas-based, rotation (90L/180/90R), crop with drag, rule-of-thirds, corner handles, quality slider (20-100%) |
| `MediaUploader` | Drag-and-drop zone, file input, drag-over feedback, progress %, accepted types display, max sizes |
| `ShareStoryModal` | Friends checklist, selected count, "already shared" indicator, message (500 char), expiration days |
| `ShareModal` | Share link (copy), QR code (canvas + download), link info, social share (Twitter, Facebook, Email) |

### Friend Components (`resources/js/components/friends/`)

| Component | Key Features |
|-----------|-------------|
| `FriendCard` | Avatar circle (first letter), email, story count, View Stories, Unfriend (danger) |
| `FriendRequestCard` | Avatar, email, request date, Accept/Decline (received), Cancel (sent) |
| `FriendSearch` | Email input with Enter, search button, results with dynamic button text |

### Notification Components

| Component | Key Features |
|-----------|-------------|
| `NotificationBell` | Bell icon, red badge (unread count), dropdown (5 recent), mark all read, view all link |

### Layout

**Root Layout** (`resources/js/layouts/AppLayout.tsx`):
- Dark mode (localStorage-based, prevents flash)
- ThemeProvider wrapper
- Navigation component
- PWA install prompt (optional)

### Custom Hooks → React Hooks (keep in `resources/js/hooks/`)

| Hook | Purpose | Notes |
|------|---------|-------|
| `useAuth()` | Auth state & user info | May use Inertia's `usePage().props.auth` instead |
| `useFriends()` | Friend CRUD | Send/accept/decline/block/unfriend |
| `useNotifications()` | Notification management | 30-second auto-polling |
| `useStories()` | Story CRUD | Create/update/delete |
| `useSubscription()` | Subscription state | Tier checks, limits |
| `useAdmin()` | Admin operations | User/story/flag management |

### Responsive Design

- Grid: `grid-cols-1` → `md:grid-cols-2` → `lg:grid-cols-3`
- Visibility: `hidden sm:flex`, `sm:hidden`
- Max-widths: `max-w-3xl`, `max-w-4xl`, `max-w-7xl`
- Padding: `px-4 sm:px-6 lg:px-8`
- Mobile hamburger menu
- Touch-optimized (large buttons, swipe gestures)

---

## 7. File Storage

### Supabase Storage → Laravel Filesystem

| Feature | Original | Laravel |
|---------|----------|---------|
| Bucket | `media` (public) | `public` disk or custom `media` disk |
| Upload path | `{type}s/{user-id}/{timestamp}-{rand}.{ext}` | Same pattern via `Storage::disk('media')` |
| Public access | Supabase CDN | `storage:link` → `/storage/media/...` |
| Auth upload | RLS: path includes `auth.uid()` | Middleware + Policy |
| Auth delete | RLS: path includes user ID | Policy: user owns the file path |

### Storage Config

```php
// config/filesystems.php
'disks' => [
    'media' => [
        'driver' => 'local',
        'root' => storage_path('app/public/media'),
        'url' => env('APP_URL') . '/storage/media',
        'visibility' => 'public',
    ],
],
```

### Upload Path Pattern

```php
// images/{user_id}/{timestamp}-{random}.{ext}
// videos/{user_id}/{timestamp}-{random}.{ext}
// audio/{user_id}/{timestamp}-{random}.{ext}
$path = sprintf(
    '%ss/%d/%d-%s.%s',
    $mediaType,
    auth()->id(),
    time(),
    Str::random(8),
    $file->getClientOriginalExtension()
);
```

---

## 8. Stripe Integration

### Checkout Flow

```
User clicks "Upgrade" → POST /api/stripe/checkout
  → Creates Stripe Checkout Session (mode: subscription)
  → Returns session URL → Redirect user
  → User completes payment on Stripe
  → Stripe sends webhook → POST /api/stripe/webhook
  → Update users.subscription_tier = 'premium'
  → Update users.subscription_id, subscription_status
```

### Customer Portal

```
User clicks "Manage Subscription" → POST /api/stripe/portal
  → Creates Stripe Billing Portal Session
  → Returns portal URL → Redirect user
```

### Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set tier = premium, store subscription_id |
| `customer.subscription.updated` | Update status (active/cancelled) |
| `customer.subscription.deleted` | Set tier = free, status = expired |
| `invoice.payment_succeeded` | Log activity |
| `invoice.payment_failed` | Log activity, optionally notify user |

### Implementation

```php
// app/Http/Controllers/StripeWebhookController.php
// - Verify webhook signature (STRIPE_WEBHOOK_SECRET)
// - Parse event type
// - Update user subscription fields
// - Log activity
```

### Stripe Config

- Premium price: `$9/month` (STRIPE_PREMIUM_PRICE_ID)
- Use Stripe PHP SDK directly (or Laravel Cashier)
- Webhook signature verification required

---

## 9. Security

### Middleware (Security Headers)

```php
// app/Http/Middleware/SecurityHeaders.php
$response->headers->set('X-Content-Type-Options', 'nosniff');
$response->headers->set('X-Frame-Options', 'DENY');
$response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
$response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
$response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
```

### RLS → Laravel Policies

| Supabase RLS | Laravel Policy |
|-------------|----------------|
| Users can view own profile | `UserPolicy@view` |
| Users can update own profile | `UserPolicy@update` |
| Users can CRUD own stories | `StoryPolicy@view/create/update/delete` |
| Users can view shared stories | `StoryPolicy@view` (check story_shares) |
| Users can CRUD own frames | `FramePolicy` (delegates to story ownership) |
| Users can manage own friendships | `FriendshipPolicy` |
| Users can manage own shares | `StorySharePolicy` |
| Users can view own notifications | `NotificationPolicy` |
| Users can view own activity | `ActivityLogPolicy` |
| Admins can view everything | `Gate::before()` for admin bypass |

### Admin Gate

```php
// app/Providers/AppServiceProvider.php
Gate::before(function (User $user, string $ability) {
    if ($user->is_admin) {
        return true;
    }
});
```

### File Upload Security

- MIME type validation (server-side)
- File extension whitelist
- Magic bytes verification (prevent SSRF/file disguise)
- Max file sizes enforced
- Files stored in user-scoped paths

### SSRF Protection

- Validate URLs against internal/private IP ranges
- Magic bytes verification on uploaded files

---

## 10. Admin System

### Admin Pages & Capabilities

| Page | Features |
|------|----------|
| **Users** | Paginated user list, search/filter, suspend/unsuspend, toggle admin, view details |
| **User Detail** | Profile info, subscription, story count, activity log, actions |
| **Analytics** | User count, story count, active users, subscription breakdown (recharts) |
| **Logs** | Paginated activity logs, filter by category/user/date |
| **Features** | Toggle feature flags, set rollout %, update descriptions |
| **Config** | View/edit config values (JSON), track who updated |
| **Stories** | Browse all stories, feature/unfeature, delete |
| **Moderation** | List flagged stories, review content, unflag/delete, view flag reason |

### Admin Middleware

```php
// app/Http/Middleware/EnsureUserIsAdmin.php
if (! $request->user()?->is_admin) {
    abort(403);
}
```

---

## 11. Configuration & Feature Flags

### Config Table Defaults

```php
// database/seeders/ConfigSeeder.php
[
    ['key' => 'max_free_stories', 'value' => json_encode(5)],
    ['key' => 'max_premium_stories', 'value' => json_encode(null)],  // unlimited
    ['key' => 'max_frames_per_story', 'value' => json_encode(100)],
    ['key' => 'max_free_friends', 'value' => json_encode(10)],
    ['key' => 'max_premium_friends', 'value' => json_encode(500)],
    ['key' => 'max_free_shares_per_story', 'value' => json_encode(3)],
    ['key' => 'max_premium_shares_per_story', 'value' => json_encode(50)],
    ['key' => 'share_link_duration_hours', 'value' => json_encode(72)],
    ['key' => 'max_image_size_mb', 'value' => json_encode(10)],
    ['key' => 'max_video_size_mb', 'value' => json_encode(100)],
    ['key' => 'friend_request_rate_limit_per_hour', 'value' => json_encode(['free' => 10, 'premium' => 50])],
    ['key' => 'default_frame_duration_ms', 'value' => json_encode(5000)],
]
```

### Feature Flags Defaults

```php
// database/seeders/FeatureFlagSeeder.php
[
    ['key' => 'video_editing', 'enabled' => true, 'rollout_percentage' => 100, 'description' => 'Video editing support'],
    ['key' => 'social_login', 'enabled' => false, 'rollout_percentage' => 0, 'description' => 'OAuth social login'],
    ['key' => 'story_discovery', 'enabled' => true, 'rollout_percentage' => 100, 'description' => 'Public story discovery'],
    ['key' => 'ai_captions', 'enabled' => false, 'rollout_percentage' => 0, 'description' => 'AI-generated captions'],
]
```

### Config Service

```php
// app/Services/ConfigService.php
class ConfigService
{
    public function get(string $key, mixed $default = null): mixed { ... }
    public function set(string $key, mixed $value): void { ... }
    public function isFeatureEnabled(string $key): bool { ... }
}
```

---

## 12. Testing

### Test Coverage Areas

| Area | Type | What to Test |
|------|------|-------------|
| Auth | Feature | Registration, login, logout, password reset, suspended user blocked |
| Stories | Feature | CRUD, subscription limits, ownership authorization |
| Frames | Feature | CRUD, ordering, frame count sync, max frames limit |
| Friends | Feature | Send/accept/decline/block, rate limiting, subscription limits, no self-friend |
| Story Shares | Feature | Share with friend, revoke, view tracking, expiration, no self-share |
| Share Links | Feature | Create, access via token, expiration, view count, max views |
| Notifications | Feature | Create on events, mark read, delete, auto-cleanup |
| Upload | Feature | Image/video/audio upload, size limits, MIME validation, path generation |
| Stripe | Feature | Checkout, webhook handling, subscription tier updates |
| Admin | Feature | User management, analytics, feature flags, config, moderation |
| Policies | Unit | All policy methods for each model |
| Config Service | Unit | Get/set config, feature flag checks |
| Activity Logger | Unit | Log creation with correct fields |

### Pest Test Structure

```
tests/
├── Feature/
│   ├── Auth/
│   │   ├── RegistrationTest.php
│   │   └── LoginTest.php
│   ├── Story/
│   │   ├── StoryTest.php
│   │   └── FrameTest.php
│   ├── Friend/
│   │   └── FriendshipTest.php
│   ├── Share/
│   │   ├── StoryShareTest.php
│   │   └── ShareLinkTest.php
│   ├── NotificationTest.php
│   ├── UploadTest.php
│   ├── StripeWebhookTest.php
│   ├── Admin/
│   │   ├── UserManagementTest.php
│   │   ├── FeatureFlagTest.php
│   │   ├── ConfigTest.php
│   │   └── ModerationTest.php
│   └── SubscriptionLimitTest.php
└── Unit/
    ├── Policy/
    │   ├── StoryPolicyTest.php
    │   ├── FriendshipPolicyTest.php
    │   └── StorySharePolicyTest.php
    ├── ConfigServiceTest.php
    └── ActivityLoggerTest.php
```

---

## 13. Seed Data

```php
// database/seeders/DatabaseSeeder.php
// Creates:
// - 2 test users: alice@test.com, bob@test.com (passwords: 'password')
// - alice is admin
// - Accepted friendship between them
// - 2 stories per user (4 total)
// - 2 frames per story (8 total) with placeholder images
// - 1 story share (alice's story #1 shared with bob)
// - 1 notification (story_shared notification for bob)
// - Config table defaults
// - Feature flag defaults
```

---

## 14. Environment Variables

```env
# Application
APP_NAME="Media Stories"
APP_URL=http://media-stories.test

# Database (local)
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database.sqlite

# Database (production)
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=media_stories
# DB_USERNAME=root
# DB_PASSWORD=

# Stripe
STRIPE_KEY=pk_test_xxx
STRIPE_SECRET=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PREMIUM_PRICE_ID=price_xxx

# File Storage
FILESYSTEM_DISK=media

# Mail (for password reset, etc.)
MAIL_MAILER=smtp
```
