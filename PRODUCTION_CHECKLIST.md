# Production Checklist

Things to complete before deploying Media Stories to production.

---

## Branding

- [ ] **Favicon** — Replace `public/favicon.ico` and `public/favicon.svg` with your actual icon. Use [realfavicongenerator.net](https://realfavicongenerator.net) to generate all sizes.
- [ ] **Apple touch icon** — Replace `public/apple-touch-icon.png` (180×180 PNG) for iOS home screen.
- [ ] **App logo** — Update `resources/js/components/app-logo.tsx` and `app-logo-icon.tsx` with your real logo.
- [ ] **App name** — Set `APP_NAME` in `.env` (currently `"Media Stories"`; confirm this is final).
- [ ] **Welcome page** — Review `resources/js/pages/welcome.tsx` — hero text, feature cards, pricing copy.

---

## Environment & Security

- [ ] **`APP_ENV=production`** — Switch from `local`.
- [ ] **`APP_DEBUG=false`** — Currently `true`; must be `false` in production to prevent stack traces leaking.
- [ ] **`APP_URL`** — Set to your real domain (e.g. `https://mediastories.com`).
- [ ] **`APP_KEY`** — Run `php artisan key:generate` on the production server if not already set.
- [ ] **Session & cache** — Currently using the `database` driver, which is fine for a single server. Consider `redis` for multi-server deployments.

---

## Database

- [ ] **Switch to MySQL** — Update `DB_CONNECTION`, `DB_HOST`, `DB_DATABASE`, `DB_USERNAME`, `DB_PASSWORD` in `.env`.
- [ ] **Run migrations** — `php artisan migrate --force` on the production database.
- [ ] **Seed config & feature flags** — `php artisan db:seed` to populate the `config` and `feature_flags` tables with defaults (see `media-stories-convert.md` § 11–12).
- [ ] **Storage symlink** — Run `php artisan storage:link` once on the production server.

---

## File Storage

- [ ] **Switch to S3** — Currently using local disk. Configure the `media` disk in `config/filesystems.php` to use S3 and set these env vars:
  ```
  AWS_ACCESS_KEY_ID=
  AWS_SECRET_ACCESS_KEY=
  AWS_DEFAULT_REGION=
  AWS_BUCKET=
  AWS_URL=
  ```

---

## Mail

- [ ] **Configure mailer** — Currently set to `log` (emails are only written to the log file). Set up a real provider (e.g. Mailgun, Postmark, SES) via:
  ```
  MAIL_MAILER=
  MAIL_HOST=
  MAIL_PORT=
  MAIL_USERNAME=
  MAIL_PASSWORD=
  MAIL_FROM_ADDRESS=
  MAIL_FROM_NAME=
  ```
- [ ] **Test email flows** — Password reset and email verification both rely on mail working.

---

## Stripe

- [ ] **Live Stripe keys** — Replace test keys with live keys:
  ```
  STRIPE_KEY=pk_live_xxx
  STRIPE_SECRET=sk_live_xxx
  STRIPE_WEBHOOK_SECRET=whsec_xxx
  STRIPE_PREMIUM_PRICE_ID=price_xxx
  ```
- [ ] **Register webhook** — Add `POST /api/stripe/webhook` as a webhook endpoint in the Stripe dashboard for these events:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- [ ] **Test upgrade/downgrade flow** — Verify the Stripe Checkout and Billing Portal flows end-to-end.

---

## Queue

- [ ] **Queue worker** — Currently using the `database` driver. Ensure a queue worker process is running on the server:
  ```bash
  php artisan queue:work --daemon
  ```
  Or use Supervisor to keep it running. Consider switching to Redis for better performance.

---

## Notifications

- [ ] **Wire up NotificationBell** — The `notification-bell.tsx` component is built but not added to the navigation header (`app-header.tsx`). Add it before launch so users see in-app notifications.

---

## Admin

- [ ] **Create your admin user** — After seeding, run:
  ```bash
  php artisan tinker
  App\Models\User::where('email', 'you@example.com')->update(['is_admin' => true]);
  ```
- [ ] **Remove or lock down seed users** — Delete or change passwords for `alice@test.com` and `bob@test.com` if the seeder was run.

---

## Performance & Infrastructure

- [ ] **Optimize autoloader** — `composer install --optimize-autoloader --no-dev`
- [ ] **Cache config & routes** — `php artisan config:cache && php artisan route:cache && php artisan view:cache`
- [ ] **Assets** — Run `npm run build` and deploy the `public/build/` directory.
- [ ] **HTTPS** — Ensure SSL is configured. The `AddSecurityHeaders` middleware sends `Strict-Transport-Security` headers.
- [ ] **PHP version** — App targets PHP 8.4. Confirm production server matches.
