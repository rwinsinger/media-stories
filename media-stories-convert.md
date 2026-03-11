# Media Stories — Full Conversion Guide
## Next.js + Supabase → Laravel 12 + Inertia v2 + React

> Generated: 2026-02-17
> Source: Next.js 16 App Router + Supabase PostgreSQL + Supabase Storage + Stripe
> Target: Laravel 12 + Inertia v2 + React + SQLite (local) / MySQL (prod) + Fortify + Stripe PHP SDK

---

## Table of Contents

1. [Tech Stack Mapping](#1-tech-stack-mapping)
2. [Database Schema](#2-database-schema)
3. [Authentication](#3-authentication)
4. [API Endpoints](#4-api-endpoints)
5. [Business Logic](#5-business-logic)
6. [Frontend Pages & Components](#6-frontend-pages--components)
7. [File Storage](#7-file-storage)
8. [Stripe Integration](#8-stripe-integration)
9. [Security](#9-security)
10. [Admin System](#10-admin-system)
11. [Configuration & Feature Flags](#11-configuration--feature-flags)
12. [Seed Data](#12-seed-data)
13. [Environment Variables](#13-environment-variables)
14. [Quick-Start Build Order](#14-quick-start-build-order)

---

## 1. Tech Stack Mapping

| Concern | Original | Target |
|---------|----------|--------|
| Framework | Next.js 16 App Router | Laravel 12 + Inertia v2 |
| Frontend | React (in Next.js) | React (`resources/js/`) |
| Auth | Supabase Auth (JWT cookies) | Laravel Fortify (session cookies) |
| Database (local) | Supabase PostgreSQL | SQLite |
| Database (prod) | Supabase PostgreSQL | MySQL |
| ORM | Prisma / Supabase SDK | Eloquent |
| File storage | Supabase Storage (`media` bucket, public) | Laravel Filesystem (`media` disk) |
| Image processing | `sharp` (npm) | Intervention Image |
| Payments | Stripe Checkout + Webhooks | Stripe PHP SDK (or Laravel Cashier) |
| QR codes | `qrcode` (npm, client-side) | Client-side (keep npm package) |
| Drag and drop | `@dnd-kit` | `@dnd-kit` (unchanged) |
| Charts | `recharts` | `recharts` (unchanged) |
| CSS | Tailwind CSS 4 | Tailwind CSS 4 (unchanged) |
| Testing | — | PestPHP 4 |

---

## 2. Database Schema

### Enums (stored as `string` columns with validation)

| Enum | Values |
|------|--------|
| SubscriptionTier | `free`, `premium` |
| SubscriptionStatus | `active`, `cancelled`, `expired` |
| ActionCategory | `auth`, `story`, `user`, `admin`, `subscription`, `share` |
| MediaType | `image`, `video` |
| FriendshipStatus | `pending`, `accepted`, `declined`, `blocked` |
| NotificationType | `friend_request`, `friend_accepted`, `story_shared`, `story_comment` |
| PermissionLevel | `view`, `comment` |

---

### Table: `users`

```php
Schema::create('users', function (Blueprint $table) {
    $table->id();
    $table->string('email')->unique();
    $table->string('password');
    $table->string('name');
    $table->string('subscription_tier')->default('free');     // free|premium
    $table->string('subscription_id')->nullable();            // Stripe subscription ID
    $table->string('subscription_status')->default('active'); // active|cancelled|expired
    $table->unsignedInteger('story_count')->default(0);
    $table->boolean('is_admin')->default(false);
    $table->boolean('is_suspended')->default(false);
    $table->text('suspended_reason')->nullable();
    $table->timestamp('last_login_at')->nullable();
    $table->json('settings')->nullable();                     // user preferences
    $table->timestamps();
});
```

---

### Table: `stories`

```php
Schema::create('stories', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('title');                    // max 100 chars
    $table->text('description')->nullable();    // max 500 chars
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

---

### Table: `frames`

```php
Schema::create('frames', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
    $table->unsignedInteger('order_index');
    $table->string('media_type');               // image|video
    $table->string('media_url');                // storage path
    $table->string('thumbnail_url')->nullable();
    $table->text('text_content')->nullable();   // overlay text, max 500 chars
    $table->string('audio_url')->nullable();
    $table->unsignedInteger('duration')->default(5000); // milliseconds, 1000–30000
    $table->json('settings')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->unique(['story_id', 'order_index']);
    $table->index('story_id');
    $table->index(['story_id', 'order_index']);
});
```

---

### Table: `share_links`

```php
Schema::create('share_links', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
    $table->string('token')->unique();
    $table->timestamp('expires_at');            // default: now() + 72 hours
    $table->unsignedInteger('view_count')->default(0);
    $table->unsignedInteger('max_views')->nullable();
    $table->timestamp('created_at')->useCurrent();

    $table->index('token');
    $table->index('story_id');
});
```

---

### Table: `friendships`

```php
Schema::create('friendships', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('requester_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('addressee_id')->constrained('users')->cascadeOnDelete();
    $table->string('status')->default('pending'); // pending|accepted|declined|blocked
    $table->timestamp('requested_at')->useCurrent();
    $table->timestamp('responded_at')->nullable();
    $table->timestamps();

    $table->unique(['requester_id', 'addressee_id']);
    $table->index(['requester_id', 'status']);
    $table->index(['addressee_id', 'status']);
    $table->index(['requester_id', 'addressee_id', 'status']);
    $table->index(['addressee_id', 'requester_id', 'status']);
});
// CHECK constraint: requester_id != addressee_id
// DB::statement('ALTER TABLE friendships ADD CONSTRAINT check_no_self_friendship CHECK (requester_id != addressee_id)');
```

---

### Table: `story_shares`

```php
Schema::create('story_shares', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignUuid('story_id')->constrained()->cascadeOnDelete();
    $table->foreignId('shared_by_user_id')->constrained('users')->cascadeOnDelete();
    $table->foreignId('shared_with_user_id')->constrained('users')->cascadeOnDelete();
    $table->string('permission_level')->default('view'); // view|comment
    $table->timestamp('shared_at')->useCurrent();
    $table->timestamp('expires_at')->nullable();
    $table->unsignedInteger('view_count')->default(0);
    $table->timestamp('last_viewed_at')->nullable();
    $table->boolean('is_revoked')->default(false);
    $table->timestamp('revoked_at')->nullable();
    $table->text('message')->nullable();

    $table->unique(['story_id', 'shared_with_user_id']);
    $table->index('story_id');
    $table->index(['shared_with_user_id', 'is_revoked']);
    $table->index(['shared_by_user_id', 'is_revoked']);
    $table->index('expires_at');
});
// CHECK constraint: shared_by_user_id != shared_with_user_id
```

---

### Table: `notifications`

```php
Schema::create('notifications', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->constrained()->cascadeOnDelete();
    $table->string('type'); // friend_request|friend_accepted|story_shared|story_comment
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

---

### Table: `activity_logs`

```php
Schema::create('activity_logs', function (Blueprint $table) {
    $table->uuid('id')->primary();
    $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
    $table->string('action');                   // e.g. story.created, friend.accepted
    $table->string('action_category');          // auth|story|user|admin|subscription|share
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

---

### Table: `config`

```php
Schema::create('config', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->json('value');
    $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
});
```

---

### Table: `feature_flags`

```php
Schema::create('feature_flags', function (Blueprint $table) {
    $table->string('key')->primary();
    $table->boolean('enabled')->default(false);
    $table->text('description')->nullable();
    $table->unsignedTinyInteger('rollout_percentage')->default(0);
    $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
    $table->foreignId('updated_by')->nullable()->constrained('users')->nullOnDelete();
});
```

---

### Eloquent Observers (replaces Supabase PostgreSQL triggers)

```php
// app/Observers/FrameObserver.php
class FrameObserver
{
    public function created(Frame $frame): void
    {
        $frame->story()->increment('frame_count');
    }

    public function deleted(Frame $frame): void
    {
        $frame->story()->decrement('frame_count');
    }
}
```

Register in `AppServiceProvider::boot()`:

```php
Frame::observe(FrameObserver::class);
```

Story view count (replaces PostgreSQL `increment_story_views()` function):

```php
Story::query()->where('id', $story->id)->increment('view_count');
```

---

## 3. Authentication

### System Mapping

| Feature | Supabase | Laravel Fortify |
|---------|----------|-----------------|
| Signup | `auth.signUp()` | POST `/register` |
| Login | `auth.signInWithPassword()` | POST `/login` |
| Logout | `auth.signOut()` | POST `/logout` |
| Session | JWT in cookies | Laravel session (encrypted cookies) |
| Password reset | Supabase built-in | Fortify password reset |
| Email verification | Supabase built-in | Fortify `MustVerifyEmail` |
| Admin check | `users.is_admin` DB column | `$user->is_admin` + Gate/middleware |

### Custom Middleware

| Middleware | Alias | Behavior |
|-----------|-------|----------|
| `TrackLastLogin` | — | Updates `last_login_at` on each authenticated request |
| `CheckSuspended` | — | Returns 403 JSON if `$user->is_suspended` |
| `EnsureUserIsAdmin` | `admin` | Aborts 403 if `!$user->is_admin` |
| `EnsureSubscription` | `subscription` | Checks subscription tier (e.g., `subscription:premium`) |
| `AddSecurityHeaders` | — | Adds security headers to every response |

### Route Guard Mapping (React → Laravel Middleware)

| Original React Component | Laravel Middleware |
|-------------------------|-------------------|
| `<ProtectedRoute>` | `auth` |
| `<AdminGuard>` | `admin` |
| `<SubscriptionGuard>` | `subscription:premium` |

---

## 4. API Endpoints

### Auth Routes (Fortify)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/register` | Register new user |
| POST | `/login` | Login |
| POST | `/logout` | Logout |
| POST | `/forgot-password` | Request password reset |
| POST | `/reset-password` | Reset password with token |
| GET | `/email/verify/{id}/{hash}` | Verify email address |
| POST | `/email/verification-notification` | Resend verification email |

### Core API Routes (require `auth` middleware)

| # | Method | Path | Controller Method | Notes |
|---|--------|------|------------------|-------|
| 1 | GET | `/api/stories` | `StoryController@index` | User's own stories |
| 2 | POST | `/api/stories` | `StoryController@store` | Checks story limit |
| 3 | GET | `/api/stories/{story}` | `StoryController@show` | Own or shared to user |
| 4 | PUT | `/api/stories/{story}` | `StoryController@update` | Owner only |
| 5 | DELETE | `/api/stories/{story}` | `StoryController@destroy` | Owner only |
| 6 | POST | `/api/stories/{story}/flag` | `StoryController@flag` | Any authenticated user |
| 7 | GET | `/api/stories/{story}/frames` | `FrameController@index` | Story access check |
| 8 | POST | `/api/stories/{story}/frames` | `FrameController@store` | Owner, max 100 frames |
| 9 | GET | `/api/frames/{frame}` | `FrameController@show` | Access via story |
| 10 | PUT | `/api/frames/{frame}` | `FrameController@update` | Owner only |
| 11 | DELETE | `/api/frames/{frame}` | `FrameController@destroy` | Owner only |
| 12 | GET | `/api/friends` | `FriendController@index` | Accepted friendships |
| 13 | POST | `/api/friends` | `FriendController@store` | Rate-limited by tier |
| 14 | PUT | `/api/friends/{friend}` | `FriendController@update` | Accept/decline/block |
| 15 | DELETE | `/api/friends/{friend}` | `FriendController@destroy` | Unfriend |
| 16 | GET | `/api/friends/search` | `FriendController@search` | Search by email |
| 17 | GET | `/api/story-shares` | `StoryShareController@index` | Shared with/by user |
| 18 | POST | `/api/story-shares` | `StoryShareController@store` | Share with friend |
| 19 | DELETE | `/api/story-shares/{storyShare}` | `StoryShareController@destroy` | Revoke (shared_by only) |
| 20 | PATCH | `/api/story-shares/{storyShare}/view` | `StoryShareController@trackView` | Track view event |
| 21 | GET | `/api/notifications` | `NotificationController@index` | User's notifications |
| 22 | PATCH | `/api/notifications` | `NotificationController@markAllRead` | Mark all read |
| 23 | DELETE | `/api/notifications/{notification}` | `NotificationController@destroy` | Delete one |
| 24 | POST | `/api/share-links` | `ShareLinkController@store` | Generate share link |
| 25 | POST | `/api/upload` | `UploadController@store` | Upload media file |
| 26 | POST | `/api/process-image` | `ImageProcessorController@process` | Crop/rotate image |
| 27 | GET | `/api/activity` | `ActivityLogController@index` | Own activity log |
| 28 | POST | `/api/stripe/checkout` | `StripeController@checkout` | Create checkout session |
| 29 | POST | `/api/stripe/portal` | `StripeController@portal` | Create billing portal session |

### Public Routes (no auth)

| # | Method | Path | Controller Method | Notes |
|---|--------|------|------------------|-------|
| 30 | GET | `/share/{token}` | `ShareLinkController@show` | Public story viewer |
| 31 | POST | `/api/stripe/webhook` | `StripeWebhookController@handle` | Stripe signature verified |

### Admin Routes (require `auth` + `admin` middleware)

| # | Method | Path | Controller Method |
|---|--------|------|------------------|
| 32 | GET | `/api/admin/users` | `Admin\UserController@index` |
| 33 | PUT | `/api/admin/users/{user}` | `Admin\UserController@update` |
| 34 | GET | `/api/admin/analytics` | `Admin\AnalyticsController@index` |
| 35 | GET | `/api/admin/logs` | `Admin\LogController@index` |
| 36 | GET | `/api/admin/features` | `Admin\FeatureController@index` |
| 37 | PUT | `/api/admin/features/{key}` | `Admin\FeatureController@update` |
| 38 | GET | `/api/admin/config` | `Admin\ConfigController@index` |
| 39 | PUT | `/api/admin/config` | `Admin\ConfigController@update` |
| 40 | GET | `/api/admin/stories` | `Admin\StoryController@index` |
| 41 | PUT | `/api/admin/stories/{story}` | `Admin\StoryController@update` |
| 42 | DELETE | `/api/admin/stories/{story}` | `Admin\StoryController@destroy` |
| 43 | GET | `/api/admin/moderation` | `Admin\ModerationController@index` |
| 44 | PUT | `/api/admin/moderation/{story}` | `Admin\ModerationController@update` |

### Key Request/Response Specs

#### POST `/api/stories`
```json
// Request
{ "title": "My Story", "description": "Optional description" }

// 201 Created
{ "id": "uuid", "title": "My Story", "is_published": false, "frame_count": 0, "view_count": 0, "created_at": "..." }

// 422 (limit reached)
{ "message": "Story limit reached for your subscription tier." }
```

#### POST `/api/upload`
```
// Request: multipart/form-data, field: "file"

// 200 OK
{ "url": "/storage/media/images/42/1708163892-aB3xYz1q.jpg", "path": "images/42/..." }
```

#### POST `/api/friends`
```json
// Request
{ "addressee_id": 123 }

// 201 Created
{ "id": "uuid", "requester_id": 42, "addressee_id": 123, "status": "pending" }

// 429 Too Many Requests
{ "message": "Too many friend requests. Try again later." }
```

#### PUT `/api/friends/{friend}`
```json
// Request
{ "status": "accepted" }   // or "declined" or "blocked"

// 200 OK
{ "id": "uuid", "status": "accepted", "responded_at": "..." }
```

#### POST `/api/story-shares`
```json
// Request
{
  "story_id": "uuid",
  "shared_with_user_id": 123,
  "permission_level": "view",
  "message": "Check this out!",
  "expires_in_days": 7
}

// 201 Created
{ "id": "uuid", "story_id": "...", "shared_with_user_id": 123, "expires_at": "..." }
```

#### POST `/api/share-links`
```json
// Request
{ "story_id": "uuid" }

// 201 Created
{ "token": "abc123xyz", "url": "https://media-stories.test/share/abc123xyz", "expires_at": "..." }
```

---

## 5. Business Logic

### Subscription Tiers

| Feature | Free | Premium ($9/month) |
|---------|------|--------------------|
| Max stories | **5** | Unlimited |
| Max friends | **10** | **500** |
| Max shares per story | **3** | **50** |
| Friend requests/hour | **10** | **50** |
| Max frames per story | 100 | 100 |
| Share link duration | 72 hours | 72 hours |
| Max image size | 10 MB | 10 MB |
| Max video size | 100 MB | 100 MB |
| Default frame duration | 5000 ms | 5000 ms |

### Form Request Validation

#### `StoreStoryRequest`
```php
public function rules(): array
{
    return [
        'title'       => ['required', 'string', 'max:100'],
        'description' => ['nullable', 'string', 'max:500'],
    ];
}
// + custom: check user->story_count against subscription limit
```

#### `UpdateStoryRequest`
```php
public function rules(): array
{
    return [
        'title'        => ['sometimes', 'string', 'max:100'],
        'description'  => ['nullable', 'string', 'max:500'],
        'is_published' => ['sometimes', 'boolean'],
    ];
}
```

#### `StoreFrameRequest`
```php
public function rules(): array
{
    return [
        'media_type'   => ['required', 'in:image,video'],
        'media_url'    => ['required', 'string'],
        'text_content' => ['nullable', 'string', 'max:500'],
        'audio_url'    => ['nullable', 'string'],
        'duration'     => ['integer', 'min:1000', 'max:30000'],
        'order_index'  => ['required', 'integer', 'min:0'],
    ];
}
// + custom: check frame count < 100
```

#### `StoreFriendRequest`
```php
public function rules(): array
{
    return [
        'addressee_id' => ['required', 'exists:users,id'],
    ];
}
// + custom: not self, no existing friendship, rate limit check, friend count limit
```

#### `StoreStoryShareRequest`
```php
public function rules(): array
{
    return [
        'story_id'            => ['required', 'exists:stories,id'],
        'shared_with_user_id' => ['required', 'exists:users,id'],
        'permission_level'    => ['in:view,comment'],
        'message'             => ['nullable', 'string', 'max:500'],
        'expires_in_days'     => ['nullable', 'integer', 'min:1'],
    ];
}
// + custom: story owned by auth user, shared_with is accepted friend, share count limit
```

#### `UploadRequest`
```php
public function rules(): array
{
    $file = $this->file('file');
    $mime = $file?->getMimeType() ?? '';

    if (str_starts_with($mime, 'video/')) {
        return ['file' => ['required', 'file', 'max:102400', 'mimes:mp4,webm,mov']];
    }

    if (str_starts_with($mime, 'audio/')) {
        return ['file' => ['required', 'file', 'mimes:mp3,wav,ogg']];
    }

    return ['file' => ['required', 'file', 'max:10240', 'mimes:jpg,jpeg,png,gif,webp']];
}
// + custom: magic bytes verification (prevent SSRF / file type spoofing)
```

### Rate Limiting (Friend Requests)

Register in `AppServiceProvider` or `bootstrap/app.php`:

```php
RateLimiter::for('friend-requests', function (Request $request) {
    $limit = $request->user()?->subscription_tier === 'premium' ? 50 : 10;
    return Limit::perHour($limit)->by($request->user()?->id);
});
```

Apply via `throttle:friend-requests` middleware on `POST /api/friends`.

### Activity Logging

Every mutation is logged to `activity_logs`. Fields to record:

| Field | Description |
|-------|-------------|
| `user_id` | Auth user performing the action |
| `action` | Verb (e.g., `story.created`, `friend.accepted`) |
| `action_category` | `auth`, `story`, `user`, `admin`, `subscription`, `share` |
| `resource_type` | Model name (e.g., `Story`, `Friendship`) |
| `resource_id` | UUID or ID of affected resource |
| `details` | JSON with extra context |
| `ip_address` | `$request->ip()` |
| `user_agent` | `$request->userAgent()` |
| `is_admin_action` | `true` for admin routes |
| `target_user_id` | For admin actions targeting another user |

---

## 6. Frontend Pages & Components

### Page Structure (`resources/js/pages/`)

#### Authentication Pages

**`Auth/Login.tsx`** — `/login`
- Email/password form
- Link to register page
- Loading state on submit button
- Error alert on failure

**`Auth/Register.tsx`** — `/register`
- Email, password, confirm password fields (password min 6 chars)
- Terms of Service notice
- Redirect to dashboard on success

**`Welcome.tsx`** — `/` (public landing page)
- Hero section with app name and tagline
- 3 feature cards
- Pricing comparison (Free vs Premium)
- CTA buttons: Login / Get Started

---

#### Dashboard & Story Pages

**`Dashboard.tsx`** — `/dashboard`
- Welcome header with user name
- 3 stat cards: Total Stories / Published Stories / Total Views
- Responsive stories grid: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`
- Create Story button (shows limit badge when at limit)
- Empty state component with call to action

**`Story/Create.tsx`** — `/story/new`
- Title input with 100-char counter
- Description textarea with 500-char counter
- Back link to dashboard
- Submit → redirects to `/story/{id}/edit`

**`Story/Edit.tsx`** — `/story/{id}/edit`

Layout: 2/3 left column + 1/3 right sidebar

Left column:
- Story details form (title, description, published toggle)
- `FrameList` component with drag-and-drop reordering
- Add Frame button → opens `FrameEditor` modal

Right sidebar:
- Story info (frame count, view count, created date)
- Preview button
- Delete button (with confirmation)
- Share with friends → opens `ShareStoryModal`
- Copy share link → opens `ShareModal`

**`Story/Show.tsx`** — `/story/{id}/view`
- Full-screen `Slideshow` component
- Shared-by indicator (if viewing a shared story)
- Auto-play / manual controls
- Keyboard nav: `←/→` navigate, `Space` pause, `F` fullscreen, `Esc` exit
- Touch swipe navigation

---

#### Friends Pages

**`Friends/Index.tsx`** — `/friends`

3 tabs:
1. **My Friends** — `FriendCard` grid, unfriend action
2. **Requests** — `FriendRequestCard` list (received + sent), badge with pending count
3. **Find Friends** — `FriendSearch` component + results

**`Friends/Stories.tsx`** — `/friends/{id}/stories`
- Friend header (avatar, email, story count)
- Grid of stories shared with the auth user by this friend
- Each card shows share date

---

#### Sharing Pages

**`SharedStories/Index.tsx`** — `/shared-stories`
- List view of all stories shared with the auth user
- Each item: story icon, title, shared-by email, date, message
- Expiration warning badge when < 24 hours remaining

**`Share/Show.tsx`** — `/share/{token}` (public, no auth required)
- Standalone `Slideshow` player
- No navigation header
- Shows story title, frame progression

---

#### Settings & Subscription Pages

**`Settings/Index.tsx`** — `/settings`
- Theme selection: Light / Dark / Auto (persisted in localStorage)
- Account info (email, name — read-only display)
- Password change form
- Link to activity log

**`Subscription/Index.tsx`** — `/subscription`
- Current plan name + status badge (active/cancelled/expired)
- Usage indicator bar: stories used / limit
- Manage Subscription button → Stripe billing portal
- Upgrade button → Stripe checkout
- Pricing comparison cards (Free vs Premium)
- FAQ section (4 questions)

---

#### Admin Pages (`/admin/...`)

**`Admin/Users.tsx`** — paginated user table with search/filter
- Columns: email, name, tier, status, story count, joined date, actions

**`Admin/Users/Show.tsx`** — user detail
- Profile info, subscription tier/status, story count
- Full activity log for this user
- Actions: suspend/unsuspend, toggle `is_admin`, change subscription tier

**`Admin/Analytics.tsx`** — overview stats
- Total users, total stories, active users today
- Subscription tier breakdown (recharts pie/bar chart)
- User growth graph, story creation graph over time

**`Admin/Logs.tsx`** — activity logs
- Paginated table, filters: category, user email, date range

**`Admin/Features.tsx`** — feature flag management
- List: key, description, enabled toggle, rollout % slider (0–100)
- Save button per flag

**`Admin/Config.tsx`** — config values
- Key/value table with inline JSON editing
- Shows `updated_by` and `updated_at` per key

**`Admin/Stories.tsx`** — all stories across all users
- Columns: title, author email, frames, views, published, featured, flagged
- Actions: feature/unfeature, delete

**`Admin/Moderation.tsx`** — flagged stories
- Shows: title, author, flag reason, date flagged
- Actions: unflag (`is_flagged = false`), delete story

---

### UI Components (`resources/js/components/ui/`)

#### `Button`
Props: `variant` (primary/secondary/danger/ghost), `size` (sm/md/lg), `href`, `isLoading`, `disabled`

#### `Modal`
Props: `isOpen`, `onClose`, `title`, `children`, `footer`, `maxWidth`
- Responsive, dismissable with Esc key, scrollable body

#### `Alert`
Props: `type` (error/success/info/warning), `message`, `onDismiss`
- Color-coded per type

#### `EmptyState`
Props: `icon`, `title`, `message`, `actionLabel`, `actionHref`, `onAction`

#### `StatCard`
Props: `label`, `value`, `valueColor`, `subtitle`

#### `Spinner`
Props: `size` (sm/md/lg), `label` — animated, accessible

#### `Navigation`
- Sticky header
- Nav links: Dashboard, Friends, Shared Stories, Subscription
- `NotificationBell` component (right side)
- Mobile hamburger menu

---

### Story Components (`resources/js/components/story/`)

#### `StoryCard`
- Link to edit page
- Title, description (2-line `line-clamp`)
- Published badge (green when published, gray when draft)
- Frame count, view count
- Delete button with confirmation dialog

#### `Slideshow`
Full-screen player:
- Progress bar across the top
- Image or video frame rendering
- Previous/Next arrows
- Progress dot indicators
- Play/Pause button
- Mute button (video only)
- Text overlay toggle
- Fullscreen toggle
- Auto-play timer: advances after each frame's `duration` ms
- Keyboard: `←/→` navigate, `Space` pause, `F` fullscreen, `Esc` exit
- Touch: swipe left/right to navigate

#### `FrameEditor` (modal)
- Media upload (required) — accepts image or video
- `ImageEditor` sub-component (optional, for images)
- Text overlay field (max 500 chars)
- Audio upload (optional)
- Duration slider: 1–30 seconds in 0.5-second steps (stored as 1000–30000 ms)

#### `FrameList`
- Drag-and-drop reordering via `@dnd-kit`
- Drag handle icon per item
- Thumbnail preview (or placeholder)
- Frame number badge
- Duration display
- Text content (clamped to 1 line)
- Media type badge (Image / Video)
- Audio indicator icon (if `audio_url` set)

#### `ImageEditor`
- Canvas-based rendering
- Rotation: 90° Left, 180°, 90° Right
- Crop with drag interaction
- Rule-of-thirds grid overlay
- Corner resize handles
- Quality slider (20–100%)
- Outputs compressed image blob

#### `MediaUploader`
- Drag-and-drop zone
- File input fallback
- Drag-over visual feedback
- Upload progress percentage display
- Accepted file types listed
- Max file sizes listed

#### `ShareStoryModal`
- Checklist of accepted friends
- Selected count indicator
- "Already shared" label per friend (grayed out)
- Message textarea (max 500 chars)
- Expiration days selector

#### `ShareModal`
- Generated share link with copy button
- QR code (canvas-rendered, downloadable as PNG)
- Link expiry and view count info
- Social share buttons: Twitter, Facebook, Email

---

### Friend Components

#### `FriendCard`
- Avatar circle (first letter of email)
- Email display
- Story count
- "View Stories" link → `/friends/{id}/stories`
- "Unfriend" danger button with confirmation

#### `FriendRequestCard`
- Avatar circle, email, request date
- If received: Accept (primary) + Decline (secondary) buttons
- If sent: Cancel (ghost) button

#### `FriendSearch`
- Email text input, submits on Enter
- Search button
- Results with dynamic button text:
  - "Send Request" (not connected)
  - "Pending" (request sent)
  - "Friends" (already connected)
  - "Add Friend" (was declined)

---

### Notification Components

#### `NotificationBell`
- Bell icon in navigation header
- Red badge with unread count
- Dropdown with 5 most recent notifications
- "Mark All Read" button
- "View All" link
- Polls `/api/notifications` every **30 seconds** automatically

---

### Layout (`resources/js/layouts/AppLayout.tsx`)
- Dark mode support, reads from localStorage, prevents flash on load
- `ThemeProvider` wrapper
- `Navigation` component
- Optional PWA install prompt

### Responsive Design Conventions

| Pattern | Tailwind Classes |
|---------|----------------|
| Story grid | `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` |
| Content width | `max-w-3xl`, `max-w-4xl`, `max-w-7xl` |
| Horizontal padding | `px-4 sm:px-6 lg:px-8` |

---

### Custom Hooks (`resources/js/hooks/`)

| Hook | Purpose |
|------|---------|
| `useAuth()` | Auth state, current user info |
| `useFriends()` | Send/accept/decline/block/unfriend |
| `useNotifications()` | Notification list + 30s auto-poll |
| `useStories()` | Create/update/delete stories |
| `useSubscription()` | Tier checks, limit helpers |
| `useAdmin()` | User/story/flag management (admin only) |

---

## 7. File Storage

### Supabase → Laravel Mapping

| Original (Supabase) | Laravel |
|--------------------|---------|
| `media` bucket (public) | `media` disk |
| RLS: path must contain `auth.uid()` | Policies checking user owns the file path |

### Storage Config (`config/filesystems.php`)

```php
'disks' => [
    'media' => [
        'driver'     => 'local',
        'root'       => storage_path('app/public/media'),
        'url'        => env('APP_URL').'/storage/media',
        'visibility' => 'public',
    ],
    // Production (S3):
    // 'media' => [
    //     'driver'     => 's3',
    //     'key'        => env('AWS_ACCESS_KEY_ID'),
    //     'secret'     => env('AWS_SECRET_ACCESS_KEY'),
    //     'region'     => env('AWS_DEFAULT_REGION'),
    //     'bucket'     => env('AWS_BUCKET'),
    //     'url'        => env('AWS_URL'),
    //     'visibility' => 'public',
    // ],
],
```

Run `php artisan storage:link` once to create the public symlink.

### Upload Path Pattern

```
{type}/{user_id}/{timestamp}-{random8}.{ext}
```

| File type | Example path |
|-----------|-------------|
| Image | `images/42/1708163892-aB3xYz1q.jpg` |
| Video | `videos/42/1708163892-aB3xYz1q.mp4` |
| Audio | `audio/42/1708163892-aB3xYz1q.mp3` |

### Upload Controller Skeleton

```php
$ext  = $file->getClientOriginalExtension();
$mime = $file->getMimeType();
$type = match (true) {
    str_starts_with($mime, 'video/') => 'videos',
    str_starts_with($mime, 'audio/') => 'audio',
    default                          => 'images',
};

$path = "{$type}/{$user->id}/".time().'-'.Str::random(8).".{$ext}";
Storage::disk('media')->put($path, file_get_contents($file));

return response()->json([
    'url'  => Storage::disk('media')->url($path),
    'path' => $path,
]);
```

### Image Processing

Original used `sharp` (Node.js). Laravel replacement: **Intervention Image** (`intervention/image`).

Supported operations (via `POST /api/process-image`):
- Rotation: 90° left, 180°, 90° right
- Crop (with drag-defined pixel bounds from client)
- Quality compression (20–100%)

---

## 8. Stripe Integration

### Upgrade Flow

1. User clicks "Upgrade to Premium"
2. Frontend → `POST /api/stripe/checkout`
3. Server creates Stripe Checkout Session (`mode: 'subscription'`, `price: STRIPE_PREMIUM_PRICE_ID`)
4. Response: `{ url: 'https://checkout.stripe.com/...' }`
5. Frontend redirects to Stripe-hosted checkout
6. User completes payment
7. Stripe fires `checkout.session.completed` webhook
8. Server sets `subscription_tier = 'premium'`, stores `subscription_id`, sets `subscription_status = 'active'`

### Billing Portal Flow

1. User clicks "Manage Subscription"
2. Frontend → `POST /api/stripe/portal`
3. Server creates Stripe Billing Portal Session
4. Response: `{ url: 'https://billing.stripe.com/...' }`
5. Frontend redirects to portal

### Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Set `subscription_tier = 'premium'`, store `subscription_id` |
| `customer.subscription.updated` | Update `subscription_status` |
| `customer.subscription.deleted` | Set `subscription_tier = 'free'`, `subscription_status = 'expired'` |
| `invoice.payment_succeeded` | Log activity (category: `subscription`) |
| `invoice.payment_failed` | Log activity, optionally notify user via email |

### Webhook Controller Skeleton

```php
public function handle(Request $request): Response
{
    try {
        $event = Webhook::constructEvent(
            $request->getContent(),
            $request->header('Stripe-Signature'),
            config('services.stripe.webhook_secret')
        );
    } catch (SignatureVerificationException) {
        return response('Invalid signature', 400);
    }

    match ($event->type) {
        'checkout.session.completed'    => $this->handleCheckoutCompleted($event->data->object),
        'customer.subscription.updated' => $this->handleSubscriptionUpdated($event->data->object),
        'customer.subscription.deleted' => $this->handleSubscriptionDeleted($event->data->object),
        'invoice.payment_succeeded'     => $this->handlePaymentSucceeded($event->data->object),
        'invoice.payment_failed'        => $this->handlePaymentFailed($event->data->object),
        default                         => null,
    };

    return response('OK', 200);
}
```

### Services Config (`config/services.php`)

```php
'stripe' => [
    'key'              => env('STRIPE_KEY'),
    'secret'           => env('STRIPE_SECRET'),
    'webhook_secret'   => env('STRIPE_WEBHOOK_SECRET'),
    'premium_price_id' => env('STRIPE_PREMIUM_PRICE_ID'),
],
```

---

## 9. Security

### Security Headers Middleware

```php
class AddSecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
        $response->headers->set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
        return $response;
    }
}
```

### Authorization Policies

| Resource | Policy | Key Method Notes |
|---------|--------|-----------------|
| `User` | `UserPolicy` | `view`/`update`: own profile only |
| `Story` | `StoryPolicy` | `view`: own or shared-to-user; `create/update/delete`: owner only |
| `Frame` | `FramePolicy` | Delegates to `StoryPolicy` (story ownership) |
| `Friendship` | `FriendshipPolicy` | `update/delete`: requester or addressee only |
| `StoryShare` | `StorySharePolicy` | `view`: shared_by or shared_with; `delete`: shared_by only |
| `Notification` | `NotificationPolicy` | `view/delete`: recipient only |
| `ActivityLog` | `ActivityLogPolicy` | `view`: own logs only |

Admin Gate bypass (in `AppServiceProvider::boot()`):

```php
Gate::before(function (User $user, string $ability): ?bool {
    if ($user->is_admin) {
        return true;
    }
    return null;
});
```

### File Upload Security

All uploads validated with:
1. Server-side MIME type check (do not trust client-provided type)
2. File extension whitelist
3. Magic bytes verification (read raw file header bytes to confirm actual type)
4. Max file size: 10 MB images, 100 MB video
5. User-scoped storage paths (include `user_id` in path)

Magic bytes reference:

| Type | Magic Bytes |
|------|------------|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47` |
| GIF | `47 49 46 38` |
| WebP | `52 49 46 46` + `57 45 42 50` at offset 8 |
| MP4 | `66 74 79 70` at byte offset 4 |
| WebM | `1A 45 DF A3` |

### Suspended User Middleware

```php
if ($request->user()?->is_suspended) {
    return response()->json([
        'message' => 'Account suspended: '.$request->user()->suspended_reason,
    ], 403);
}
```

---

## 10. Admin System

### Admin Middleware

```php
// app/Http/Middleware/EnsureUserIsAdmin.php
public function handle(Request $request, Closure $next): Response
{
    if (! $request->user()?->is_admin) {
        abort(403, 'Unauthorized.');
    }
    return $next($request);
}
```

Register alias `'admin'` in `bootstrap/app.php`:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias(['admin' => EnsureUserIsAdmin::class]);
})
```

### Admin Capabilities

| Page | Capabilities |
|------|-------------|
| Users | Paginated list, search/filter by tier/status, suspend/unsuspend, toggle `is_admin`, change tier |
| User Detail | View profile + subscription + story count; full activity log; all admin actions |
| Analytics | User count, story count, active users today; tier breakdown chart; growth graphs |
| Logs | Paginated activity logs; filter by category, user, date range |
| Features | Toggle `enabled`; set `rollout_percentage` (0–100); update `description` |
| Config | View/edit JSON config values; tracks `updated_by` + `updated_at` per key |
| Stories | Browse all users' stories; set `is_featured`; delete |
| Moderation | List `is_flagged = true` stories; view `flagged_reason`; unflag or delete |

---

## 11. Configuration & Feature Flags

### ConfigService (`app/Services/ConfigService.php`)

```php
class ConfigService
{
    public function get(string $key, mixed $default = null): mixed
    {
        return Cache::remember("config.{$key}", 60, fn () =>
            Config::query()->find($key)?->value ?? $default
        );
    }

    public function set(string $key, mixed $value, ?int $updatedBy = null): void
    {
        Config::query()->updateOrCreate(['key' => $key], [
            'value'      => $value,
            'updated_by' => $updatedBy,
        ]);
        Cache::forget("config.{$key}");
    }

    public function isFeatureEnabled(string $key): bool
    {
        return FeatureFlag::query()->find($key)?->enabled ?? false;
    }
}
```

> Note: `Config` here refers to an Eloquent model `App\Models\Config` — not the Laravel `config()` helper.

### Config Table Defaults (seeder)

| Key | Value |
|-----|-------|
| `max_free_stories` | `5` |
| `max_premium_stories` | `null` |
| `max_frames_per_story` | `100` |
| `max_free_friends` | `10` |
| `max_premium_friends` | `500` |
| `max_free_shares_per_story` | `3` |
| `max_premium_shares_per_story` | `50` |
| `share_link_duration_hours` | `72` |
| `max_image_size_mb` | `10` |
| `max_video_size_mb` | `100` |
| `friend_request_rate_limit_per_hour` | `{"free": 10, "premium": 50}` |
| `default_frame_duration_ms` | `5000` |

### Feature Flag Defaults (seeder)

| Key | Enabled | Rollout % | Description |
|-----|---------|-----------|-------------|
| `video_editing` | true | 100 | Video editing support |
| `social_login` | false | 0 | OAuth social login |
| `story_discovery` | true | 100 | Public story discovery |
| `ai_captions` | false | 0 | AI-generated captions |

---

## 12. Seed Data

### Users

| Field | alice | bob |
|-------|-------|-----|
| email | `alice@test.com` | `bob@test.com` |
| name | Alice | Bob |
| is_admin | `true` | `false` |
| subscription_tier | `premium` | `free` |
| password | `password` | `password` |

### Friendships

One accepted friendship: alice ↔ bob (`status = 'accepted'`)

### Stories

| User | Title | Frames | Published |
|------|-------|--------|-----------|
| alice | "Alice's Story 1" | 2 (placeholder images) | `true` |
| alice | "Alice's Story 2" | 2 (placeholder images) | `false` |
| bob | "Bob's Story 1" | 2 (placeholder images) | `true` |
| bob | "Bob's Story 2" | 2 (placeholder images) | `false` |

### Story Shares

alice shares "Alice's Story 1" with bob (`permission_level = 'view'`, not revoked)

### Notifications

bob receives one `story_shared` notification from alice for "Alice's Story 1"

### Config & Feature Flags

Both tables seeded with the defaults listed in Section 11.

---

## 13. Environment Variables

```env
# ─── Application ───────────────────────────────────────────────────────────────
APP_NAME="Media Stories"
APP_ENV=local
APP_KEY=                          # php artisan key:generate
APP_DEBUG=true
APP_URL=http://media-stories.test

# ─── Database (local — SQLite) ─────────────────────────────────────────────────
DB_CONNECTION=sqlite
DB_DATABASE=/absolute/path/to/database/database.sqlite

# ─── Database (production — MySQL) ─────────────────────────────────────────────
# DB_CONNECTION=mysql
# DB_HOST=127.0.0.1
# DB_PORT=3306
# DB_DATABASE=media_stories
# DB_USERNAME=root
# DB_PASSWORD=

# ─── File Storage ──────────────────────────────────────────────────────────────
FILESYSTEM_DISK=local

# Production (S3):
# AWS_ACCESS_KEY_ID=
# AWS_SECRET_ACCESS_KEY=
# AWS_DEFAULT_REGION=us-east-1
# AWS_BUCKET=
# AWS_URL=

# ─── Stripe ────────────────────────────────────────────────────────────────────
STRIPE_KEY=pk_test_xxx
STRIPE_SECRET=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
STRIPE_PREMIUM_PRICE_ID=price_xxx

# ─── Mail ──────────────────────────────────────────────────────────────────────
MAIL_MAILER=log
MAIL_FROM_ADDRESS=hello@media-stories.test
MAIL_FROM_NAME="${APP_NAME}"

# ─── Queue ─────────────────────────────────────────────────────────────────────
QUEUE_CONNECTION=sync
```

---

## 14. Quick-Start Build Order

Build in this dependency order:

1. **Migrations** — users → stories → frames → share_links → friendships → story_shares → notifications → activity_logs → config → feature_flags
2. **Models** — with casts, relationships, fillable arrays
3. **Factories & Seeders** — for all models, DatabaseSeeder wires them together
4. **Observers** — `FrameObserver` for `frame_count` sync
5. **Policies** — one per resource, register in `AuthServiceProvider`, admin Gate bypass
6. **Middleware** — `TrackLastLogin`, `CheckSuspended`, `EnsureUserIsAdmin`, `AddSecurityHeaders`
7. **Form Requests** — one per controller action (store/update)
8. **Core Controllers** — Story, Frame, Friend, StoryShare, Notification, ShareLink
9. **Upload & Image Controllers** — with magic bytes validation and Intervention Image
10. **Stripe Controllers** — Checkout, Portal, Webhook
11. **Admin Controllers** — User, Analytics, Logs, Features, Config, Stories, Moderation
12. **Activity Log Service** — shared service called by all controllers
13. **ConfigService** — wraps config/feature_flags tables with caching
14. **Rate Limiters** — friend request limiter registered in service provider
15. **Fortify configuration** — auth routes, views, features enabled/disabled
16. **Inertia routes** — web.php routes pointing to Inertia::render()
17. **Frontend: Layout** — AppLayout, Navigation, dark mode
18. **Frontend: UI Components** — Button, Modal, Alert, EmptyState, StatCard, Spinner
19. **Frontend: Story Components** — StoryCard, Slideshow, FrameEditor, FrameList, ImageEditor, MediaUploader, ShareStoryModal, ShareModal
20. **Frontend: Friend Components** — FriendCard, FriendRequestCard, FriendSearch
21. **Frontend: Notification Components** — NotificationBell with 30s polling
22. **Frontend: Pages** — Auth, Dashboard, Story CRUD, Friends, SharedStories, Settings, Subscription, Admin
23. **Frontend: Custom Hooks** — useAuth, useFriends, useNotifications, useStories, useSubscription, useAdmin
24. **Pest Feature Tests** — one test file per controller group
