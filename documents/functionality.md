# Media Stories — Functionality Reference

> Laravel 12 · Inertia v2 · React · SQLite/MySQL

---

## Table of Contents

1. [Authentication](#1-authentication)
2. [User Account & Settings](#2-user-account--settings)
3. [Stories](#3-stories)
4. [Frames](#4-frames)
5. [Media Uploads & Image Processing](#5-media-uploads--image-processing)
6. [Friends](#6-friends)
7. [Story Sharing (Private)](#7-story-sharing-private)
8. [Public Share Links](#8-public-share-links)
9. [Notifications](#9-notifications)
10. [Subscriptions & Billing](#10-subscriptions--billing)
11. [Activity Logging](#11-activity-logging)
12. [Admin Panel](#12-admin-panel)
13. [Security & Middleware](#13-security--middleware)
14. [Subscription Tier Limits](#14-subscription-tier-limits)

---

## 1. Authentication

Powered by **Laravel Fortify** (headless). All auth pages share a branded dark-themed layout.

| Feature | Details |
|---|---|
| Registration | Name, email, password, password confirmation |
| Login | Email + password, "Remember me" checkbox |
| Email Verification | Required before accessing protected routes |
| Password Reset | Email-based reset link flow |
| Two-Factor Auth (2FA) | TOTP authenticator app; recovery codes provided |
| Password Confirmation | Re-prompts password before sensitive actions |
| Session Guard | Web session (cookie-based); no API tokens |

**Pages:** `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify-email`, `/two-factor-challenge`, `/confirm-password`

---

## 2. User Account & Settings

| Feature | Details |
|---|---|
| Profile Update | Change name and email address |
| Password Change | Current password required |
| Account Deletion | Permanently deletes account and all data |
| Appearance | Light / dark / system theme toggle |
| Two-Factor Setup | Enable/disable TOTP via QR code modal |
| 2FA Recovery Codes | View and regenerate backup codes |

**Pages:** `/settings/profile`, `/settings/password`, `/settings/appearance`, `/settings/two-factor`

### User Model Fields

| Field | Type | Description |
|---|---|---|
| `subscription_tier` | `free` \| `premium` | Current plan |
| `subscription_status` | `active` \| `cancelled` \| `expired` | Stripe subscription state |
| `subscription_id` | string | Stripe customer ID |
| `story_count` | integer | Cached count of user's stories |
| `is_admin` | boolean | Admin privileges |
| `is_suspended` | boolean | Account suspension flag |
| `suspended_reason` | string | Admin-provided reason |
| `last_login_at` | datetime | Updated on every authenticated request |
| `settings` | JSON | Reserved for future user preferences |

---

## 3. Stories

The core content unit. A story contains ordered frames and can be published, shared, or kept as a draft.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stories` | List authenticated user's own stories |
| `POST` | `/api/stories` | Create a new story (checks tier limit) |
| `GET` | `/api/stories/{id}` | Show a story with its frames |
| `PUT` | `/api/stories/{id}` | Update title, description, or published state |
| `DELETE` | `/api/stories/{id}` | Delete story; decrements `story_count` |
| `POST` | `/api/stories/{id}/flag` | Flag a story for admin review (any user) |

### Story Fields

| Field | Description |
|---|---|
| `title` | Required, max 255 characters |
| `description` | Optional, max 2000 characters |
| `is_published` | Controls visibility to others |
| `is_featured` | Set by admins to highlight stories |
| `is_flagged` | Set when flagged for review |
| `flagged_reason` | Reason provided when flagging |
| `frame_count` | Cached frame count (maintained by observer) |
| `view_count` | Incremented when share links or shares are viewed |

### Business Rules

- **Free users**: max 5 stories
- **Premium users**: unlimited stories
- Deleting a story decrements `user.story_count`
- Flagging adds it to the admin moderation queue with a reason

### Pages

- `/dashboard` — Story grid with create/edit/delete actions
- `/story/new` — Create form
- `/story/{id}/edit` — Frame editor with story settings
- `/story/{id}/view` — Slideshow viewer

---

## 4. Frames

A frame is a single slide within a story — an image, video, or audio clip with optional text overlay.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/stories/{story}/frames` | List all frames for a story |
| `POST` | `/api/stories/{story}/frames` | Add a frame (max 100 per story) |
| `GET` | `/api/frames/{id}` | Show a single frame |
| `PUT` | `/api/frames/{id}` | Update frame content or settings |
| `DELETE` | `/api/frames/{id}` | Delete frame; decrements `story.frame_count` |

### Frame Fields

| Field | Description |
|---|---|
| `media_type` | `image`, `video`, or `audio` |
| `media_url` | URL to the media file |
| `thumbnail_url` | Optional preview image |
| `text_content` | Optional caption or overlay text |
| `audio_url` | Optional audio track URL |
| `duration` | Display duration in milliseconds (default 5000) |
| `order_index` | Position in the story (unique per story) |
| `settings` | JSON reserved for future per-frame options |

### Business Rules

- Max **100 frames** per story
- `frame_count` on the parent story is kept in sync automatically via `FrameObserver`
- Authorization: only the story owner can add, edit, or delete frames

---

## 5. Media Uploads & Image Processing

### Upload

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/upload` | Upload a media file |

- Accepts images (JPEG, PNG, GIF, WebP), video (MP4, WebM), and audio
- **Magic bytes validation**: file headers are inspected to confirm the actual file type matches the extension — prevents disguised uploads
- Files are stored on the `media` disk under `{type}/{user_id}/{timestamp}-{random}.{ext}`
- Returns `{ url, path }` for use in frame creation

### Image Processing

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/process-image` | Crop or rotate an uploaded image |

- Uses **Intervention Image** library
- Supported operations: `crop` (x, y, width, height) and `rotate` (degrees)
- Only the image owner can process their own files (path ownership check)

---

## 6. Friends

A bidirectional friendship system. Both users must be connected before private story sharing is allowed.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/friends` | List accepted friends (with user details) |
| `POST` | `/api/friends` | Send a friend request |
| `PUT` | `/api/friends/{id}` | Accept, decline, or block a request |
| `DELETE` | `/api/friends/{id}` | Remove a friend |
| `GET` | `/api/friends/search?q=` | Search for users by name or email |

### Friendship States

| Status | Description |
|---|---|
| `pending` | Request sent, awaiting response |
| `accepted` | Both users are friends |
| `declined` | Request was declined |
| `blocked` | User blocked by addressee |

### Business Rules

- Cannot send a request to yourself
- Cannot send a duplicate request if one already exists
- **Free users**: max 30 friends
- **Premium users**: unlimited friends
- Accepting a request sends a `friend_accepted` notification to the requester
- Subject to rate limiting: 10 requests/hour (free), 50 requests/hour (premium)

### Pages

- `/friends` — Friend list, incoming requests, user search
- `/friends/{id}/stories` — Stories shared by a specific friend

---

## 7. Story Sharing (Private)

Share a specific story directly with an accepted friend. Access can be revoked at any time.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/story-shares` | List all shares sent by or received by the user |
| `POST` | `/api/story-shares` | Share a story with a friend |
| `DELETE` | `/api/story-shares/{id}` | Revoke a share (soft delete — sets `is_revoked`) |
| `PATCH` | `/api/story-shares/{id}/view` | Track that the recipient viewed the story |

### Share Fields

| Field | Description |
|---|---|
| `permission_level` | `view` (default) or `comment` |
| `message` | Optional personal message |
| `expires_at` | Optional expiry date |
| `view_count` | How many times the recipient has viewed it |
| `last_viewed_at` | Timestamp of last view |
| `is_revoked` | Whether access has been revoked |

### Business Rules

- Can only share **your own** stories
- Recipient must be an **accepted friend**
- **Free users**: max 3 active shares per story
- **Premium users**: unlimited shares per story
- Sharing triggers a `story_shared` notification to the recipient
- Revoking sets `is_revoked = true` (record preserved for audit)

### Pages

- `/shared-stories` — Stories shared with the current user

---

## 8. Public Share Links

Generate a time-limited public URL for any story. No account required to view.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/share-links` | Generate a share link for your own story |
| `GET` | `/share/{token}` | Public viewer (no auth required) |

### Share Link Fields

| Field | Description |
|---|---|
| `token` | Random 40-character unique token |
| `expires_at` | Auto-set to 72 hours from creation |
| `view_count` | Incremented on each public view |
| `max_views` | Optional cap on total views |

### Business Rules

- Only the story owner can create share links
- Accessing an **expired** link returns HTTP 410 Gone
- Accessing an **exhausted** link (max_views reached) returns HTTP 410 Gone
- Each view increments `view_count` on both the link and the parent story

### Pages

- `/share/{token}` — Public-facing story viewer with frame slideshow

---

## 9. Notifications

In-app notification feed. Polled every 30 seconds on the frontend.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | List all notifications for the current user |
| `PATCH` | `/api/notifications` | Mark all notifications as read |
| `DELETE` | `/api/notifications/{id}` | Delete a single notification |

### Notification Types

| Type | Triggered By |
|---|---|
| `friend_request` | Someone sends you a friend request |
| `friend_accepted` | Someone accepts your friend request |
| `story_shared` | A friend shares a story with you |
| `story_comment` | Reserved for future comment feature |

### Notification Fields

| Field | Description |
|---|---|
| `title` | Short heading |
| `message` | Full description |
| `link_url` | Optional deep-link |
| `is_read` | Whether the user has seen it |
| `sender_id` | User who triggered the notification |
| `resource_type` / `resource_id` | Related model (e.g. Friendship, StoryShare) |

### Component

`NotificationBell` — renders in the app header. Shows unread count badge, dropdown list, per-item dismiss, and a "Mark all read" action. Polls every 30 seconds.

---

## 10. Subscriptions & Billing

Powered by **Stripe**.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stripe/checkout` | Create a Stripe Checkout session for premium upgrade |
| `POST` | `/api/stripe/portal` | Create a Stripe Billing Portal session |
| `POST` | `/api/stripe/webhook` | Receive and process Stripe webhook events |

### Webhook Events Handled

| Event | Action |
|---|---|
| `checkout.session.completed` | Set `subscription_tier = premium`, store Stripe customer ID |
| `customer.subscription.updated` | Sync `subscription_status` |
| `customer.subscription.deleted` | Downgrade to free, set status to `expired` |
| `invoice.payment_succeeded` | Log payment success |
| `invoice.payment_failed` | Log payment failure |

### Security

- Webhook signature verified via `Stripe-Signature` header using the configured `STRIPE_WEBHOOK_SECRET`
- Invalid signatures return HTTP 400

### Pages

- `/subscription` — Plan comparison (Free vs Premium), upgrade button, manage billing portal link

---

## 11. Activity Logging

Every significant user and admin action is recorded in the `activity_logs` table.

### API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/activity` | List the authenticated user's own activity |

### Logged Actions (examples)

| Category | Actions |
|---|---|
| `story` | `story.created`, `story.updated`, `story.deleted`, `story.flagged`, `story.shared`, `story.share_revoked` |
| `user` | `friend.requested`, `friend.accepted`, `friend.declined`, `friend.removed` |
| `subscription` | `subscription.upgraded`, `subscription.expired`, `subscription.payment_succeeded`, `subscription.payment_failed` |
| `admin` | `admin.user_updated`, `admin.story_deleted_moderation`, `admin.story_unflagged` |
| `share` | `story.shared`, `story.share_revoked` |

### Log Fields

| Field | Description |
|---|---|
| `action` | Dot-notation action name |
| `action_category` | Broad category for filtering |
| `resource_type` / `resource_id` | The affected model |
| `details` | JSON payload (varies by action) |
| `ip_address` | Client IP at time of action |
| `is_admin_action` | Whether performed by an admin |
| `target_user_id` | Affected user (for admin actions) |

---

## 12. Admin Panel

Accessible only to users with `is_admin = true`. Admins bypass all authorization policies.

### Pages & Endpoints

#### Users — `/admin/users` · `GET /api/admin/users` · `PUT /api/admin/users/{id}`

- Paginated, searchable (name/email), filterable by tier and suspension status
- Actions: suspend/unsuspend, change subscription tier, grant/revoke admin

#### Analytics — `/admin/analytics` · `GET /api/admin/analytics`

- Aggregate stats: total users, premium users, total stories, total frames, new users today, new stories today

#### Activity Logs — `/admin/logs` · `GET /api/admin/logs`

- Paginated log viewer, filterable by category (story, auth, admin, subscription)

#### Feature Flags — `/admin/features` · `GET/PUT /api/admin/features/{key}`

- Toggle features on/off with a switch UI
- Pre-seeded flags: `enable_public_sharing`, `enable_premium_subscriptions`, `enable_image_processing`, `enable_notifications`

#### Site Config — `/admin/config` · `GET/PUT /api/admin/config`

- Inline-editable key/value configuration via `ConfigService` (cached 60 seconds)
- Pre-seeded keys include story/friend/share limits, max frame duration, feature names, support email, and more

#### Stories — `/admin/stories` · `GET/PUT/DELETE /api/admin/stories`

- View all stories across all users
- Feature or unfeature a story
- Hard-delete any story

#### Moderation — `/admin/moderation` · `GET/PUT /api/admin/moderation/{story}`

- Queue of all flagged stories with their flagged reason
- Actions: **Unflag** (clear flag and reason) or **Delete** (permanently remove)

---

## 13. Security & Middleware

### Middleware Stack

| Middleware | Applied To | Description |
|---|---|---|
| `AddSecurityHeaders` | All requests | Sets `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` |
| `TrackLastLogin` | Authenticated requests | Updates `users.last_login_at` silently on each request |
| `CheckSuspended` | Authenticated requests | Returns `403 { message: 'Your account has been suspended.' }` if `is_suspended = true` |
| `EnsureUserIsAdmin` | Admin routes (`admin` alias) | Aborts with 403 if user is not an admin |
| `auth` | All API routes except webhook | Laravel session authentication |
| `verified` | All API routes except webhook | Requires verified email address |
| `throttle:friend-requests` | `POST /api/friends` | Rate limits friend requests per hour |

### Authorization (Policies)

| Policy | Rules |
|---|---|
| `StoryPolicy` | View: own stories or stories shared with you. Update/delete: owner only |
| `FramePolicy` | Delegates to story ownership |
| `FriendshipPolicy` | Update/delete: requester or addressee only |
| `StorySharePolicy` | View: sender or recipient. Delete/revoke: sender only |
| `NotificationPolicy` | View/delete: recipient only |
| `ActivityLogPolicy` | View: own logs only |

**Admin bypass:** All policies are skipped for admin users via a `Gate::before` hook.

### Upload Security

- Files are validated by **magic bytes** (file header inspection), not just extension or MIME type
- Supported: JPEG (`ffd8ff`), PNG (`89504e47`), GIF (`47494638`), WebP (`52494646...57454250`), MP4, WebM (`1a45dfa3`)

---

## 14. Subscription Tier Limits

| Limit | Free | Premium |
|---|---|---|
| Stories | 5 | Unlimited |
| Friends | 30 | Unlimited |
| Active shares per story | 3 | Unlimited |
| Frames per story | 100 | 100 |
| Friend request rate limit | 10/hour | 50/hour |

Limits are enforced at the API level and return HTTP 422 with a descriptive message when exceeded.

---

## Tech Stack Summary

| Layer | Technology |
|---|---|
| Backend | PHP 8.4 · Laravel 12 |
| Auth | Laravel Fortify (session-based, headless) |
| Frontend | React 19 · Inertia v2 · TypeScript |
| Styling | Tailwind CSS 4 · shadcn/ui (Radix UI) |
| Database | SQLite (dev) · MySQL (production) |
| File Storage | Local disk (`storage/app/public/media`) |
| Payments | Stripe (Checkout, Billing Portal, Webhooks) |
| Image Processing | Intervention Image |
| Drag & Drop | @dnd-kit/core + @dnd-kit/sortable |
| Charts | Recharts |
| Type-safe Routes | Laravel Wayfinder |
| Testing | Pest 4 (95 feature tests) |
