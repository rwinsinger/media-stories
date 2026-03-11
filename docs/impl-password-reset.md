# Password Reset — Implementation Guide

Portable guide for adding password reset to a **Laravel 12 + Vue 3 SPA** project using Sanctum
token auth (API-only, no sessions).

## Assumptions

- Laravel 12 with Sanctum. API-only auth (tokens in localStorage, no session cookies for auth).
- Breeze/starter kit controllers already exist:
  `app/Http/Controllers/Auth/PasswordResetLinkController.php`
  `app/Http/Controllers/Auth/NewPasswordController.php`
- Vue 3 SPA with Pinia (`auth` store), Vue Router, and an Axios instance that calls `/api`.
- Token stored in `localStorage` as `auth_token`.
- Project has `input` and `btn-primary` CSS utility classes (dark Tailwind theme).
- Mail is configured (`MAIL_MAILER`, `MAIL_FROM_ADDRESS`, etc. in `.env`).

---

## Backend — 4 changes

### 1. `config/app.php` — add `frontend_url`

Add this line alongside the existing `'url'` key:

```php
'url' => env('APP_URL', 'http://localhost'),

'frontend_url' => env('FRONTEND_URL', env('APP_URL', 'http://localhost:8000')),
```

### 2. `.env` / `.env.example` — add `FRONTEND_URL`

```dotenv
FRONTEND_URL=http://localhost:8000
```

### 3. `app/Providers/AppServiceProvider.php` — redirect reset link to SPA

The default reset email links to a backend web route. Override the URL generator so the link
points to your SPA's `/password-reset/:token` route instead.

```php
<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        ResetPassword::createUrlUsing(function (object $notifiable, string $token) {
            return config('app.frontend_url')."/password-reset/$token?email={$notifiable->getEmailForPasswordReset()}";
        });
    }
}
```

### 4. `routes/api.php` — add two guest routes

Add these alongside your existing `/register` and `/login` guest routes:

```php
use App\Http\Controllers\Auth\PasswordResetLinkController;
use App\Http\Controllers\Auth\NewPasswordController;

Route::post('/forgot-password', [PasswordResetLinkController::class, 'store'])
    ->middleware('guest');

Route::post('/reset-password', [NewPasswordController::class, 'store'])
    ->middleware('guest');
```

---

## Frontend — 5 changes

### 1. `resources/js/stores/auth.js` — add two actions

Add `forgotPassword` and `resetPassword` to the existing actions object:

```js
async forgotPassword(email) {
  this.loading = true
  this.error = null

  try {
    const response = await axios.post('/forgot-password', { email })
    return response.data.status
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to send reset link'
    const errors = error.response?.data?.errors

    if (errors) {
      const firstError = Object.values(errors)[0]
      this.error = Array.isArray(firstError) ? firstError[0] : firstError
    } else {
      this.error = errorMessage
    }

    throw error
  } finally {
    this.loading = false
  }
},

async resetPassword(data) {
  this.loading = true
  this.error = null

  try {
    const response = await axios.post('/reset-password', data)
    return response.data.status
  } catch (error) {
    const errorMessage = error.response?.data?.message || 'Failed to reset password'
    const errors = error.response?.data?.errors

    if (errors) {
      const firstError = Object.values(errors)[0]
      this.error = Array.isArray(firstError) ? firstError[0] : firstError
    } else {
      this.error = errorMessage
    }

    throw error
  } finally {
    this.loading = false
  }
},
```

### 2. `resources/js/views/auth/ForgotPassword.vue` — new page

```vue
<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-strong mb-4 border border-slate-600">
          <svg class="h-9 w-9 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">
          Forgot Password
        </h2>
        <p class="text-slate-400 text-sm">
          Enter your email to receive a reset link
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-strong p-8 border border-slate-700">
        <!-- Success state -->
        <div v-if="success" class="space-y-6">
          <div class="rounded-xl bg-green-900/50 border border-green-700 p-4">
            <p class="text-sm text-green-300 font-medium">Check your email for a password reset link.</p>
          </div>
          <div class="text-center pt-4 border-t border-slate-700">
            <router-link
              to="/login"
              class="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Back to sign in
            </router-link>
          </div>
        </div>

        <!-- Form state -->
        <form v-else class="space-y-6" @submit.prevent="handleSubmit">
          <div v-if="authStore.error" class="rounded-xl bg-red-900/50 border border-red-700 p-4">
            <p class="text-sm text-red-300 font-medium">{{ authStore.error }}</p>
          </div>

          <div>
            <label for="email" class="block text-sm font-semibold text-slate-300 mb-2">
              Email address
            </label>
            <input
              id="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              class="input"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <button
              type="submit"
              :disabled="authStore.loading"
              class="btn-primary w-full flex justify-center text-base"
            >
              <span v-if="!authStore.loading">Send Reset Link</span>
              <span v-else class="flex items-center gap-2">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Sending...
              </span>
            </button>
          </div>

          <div class="text-center pt-4 border-t border-slate-700">
            <router-link
              to="/login"
              class="text-sm font-semibold text-sky-400 hover:text-sky-300 transition-colors"
            >
              Back to sign in
            </router-link>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useAuthStore } from '../../stores/auth'

const authStore = useAuthStore()

const email = ref('')
const success = ref(false)

const handleSubmit = async () => {
  try {
    await authStore.forgotPassword(email.value)
    success.value = true
  } catch (error) {
    // error is set on authStore.error
  }
}
</script>
```

### 3. `resources/js/views/auth/ResetPassword.vue` — new page

Reads `token` from route params and `email` from query string (pre-filled by the email link).
On success, redirects to `/login`.

```vue
<template>
  <div class="min-h-screen flex items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
    <div class="max-w-md w-full">
      <!-- Header -->
      <div class="text-center mb-8">
        <div class="inline-flex items-center justify-center w-16 h-16 bg-slate-700/50 backdrop-blur-sm rounded-2xl shadow-strong mb-4 border border-slate-600">
          <svg class="h-9 w-9 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
          </svg>
        </div>
        <h2 class="text-3xl font-bold text-white mb-2">
          Reset Password
        </h2>
        <p class="text-slate-400 text-sm">
          Enter your new password below
        </p>
      </div>

      <!-- Form Card -->
      <div class="bg-slate-800/95 backdrop-blur-md rounded-2xl shadow-strong p-8 border border-slate-700">
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <div v-if="authStore.error" class="rounded-xl bg-red-900/50 border border-red-700 p-4">
            <p class="text-sm text-red-300 font-medium">{{ authStore.error }}</p>
          </div>

          <div class="space-y-5">
            <div>
              <label for="email" class="block text-sm font-semibold text-slate-300 mb-2">
                Email address
              </label>
              <input
                id="email"
                v-model="form.email"
                type="email"
                required
                autocomplete="email"
                class="input"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label for="password" class="block text-sm font-semibold text-slate-300 mb-2">
                New Password
              </label>
              <input
                id="password"
                v-model="form.password"
                type="password"
                required
                autocomplete="new-password"
                class="input"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label for="password_confirmation" class="block text-sm font-semibold text-slate-300 mb-2">
                Confirm Password
              </label>
              <input
                id="password_confirmation"
                v-model="form.password_confirmation"
                type="password"
                required
                autocomplete="new-password"
                class="input"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              :disabled="authStore.loading"
              class="btn-primary w-full flex justify-center text-base"
            >
              <span v-if="!authStore.loading">Reset Password</span>
              <span v-else class="flex items-center gap-2">
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting...
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()

const form = reactive({
  email: route.query.email || '',
  password: '',
  password_confirmation: '',
})

const handleSubmit = async () => {
  try {
    await authStore.resetPassword({
      token: route.params.token,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    router.push('/login')
  } catch (error) {
    // error is set on authStore.error
  }
}
</script>
```

### 4. `resources/js/router/index.js` — add two guest routes

Add alongside your existing `/login` and `/register` routes:

```js
{
  path: '/forgot-password',
  name: 'forgot-password',
  component: () => import('../views/auth/ForgotPassword.vue'),
  meta: { requiresGuest: true }
},
{
  path: '/password-reset/:token',
  name: 'password-reset',
  component: () => import('../views/auth/ResetPassword.vue'),
  meta: { requiresGuest: true }
},
```

The navigation guard that handles `requiresGuest` is the same one already used by `/login`:

```js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  const isAuthenticated = !!token

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/')
  } else {
    next()
  }
})
```

### 5. `resources/js/views/auth/Login.vue` — add "Forgot your password?" link

Add this block inside the form, below the password field and before the submit button:

```vue
<div class="flex justify-end -mt-1">
  <router-link
    to="/forgot-password"
    class="text-sm font-medium text-sky-400 hover:text-sky-300 transition-colors"
  >
    Forgot your password?
  </router-link>
</div>
```

---

## Verification checklist

- [ ] `POST /api/forgot-password` with a valid email returns `{"status": "passwords.sent"}` and
  sends an email (check `storage/logs/laravel.log` when `MAIL_MAILER=log`)
- [ ] The reset link in the email points to `{FRONTEND_URL}/password-reset/{token}?email=...`
  (not a backend `/reset-password` web route)
- [ ] Visiting that URL pre-fills the email field
- [ ] Submitting the reset form with a valid token updates the password and redirects to `/login`
- [ ] Submitting with an invalid/expired token shows an error message
- [ ] Visiting `/forgot-password` or `/password-reset/:token` while authenticated redirects to `/`
- [ ] "Forgot your password?" link is visible on the Login page
