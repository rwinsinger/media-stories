# Invite Code Registration Gating — Implementation Guide

Portable guide for adding single-use invite codes to a **Laravel 12 + Vue 3 SPA** project.
Admins generate and optionally email codes; new users must supply a valid code to register.

## Assumptions

- Same Laravel 12 + Sanctum + Vue 3 SPA stack as `impl-password-reset.md`.
- User model has a `household_id` FK (adapt if your FK is named differently).
- Registration controller creates user + household atomically.
- `FRONTEND_URL` is already configured (see `impl-password-reset.md`, or add it standalone).
- Mail is configured (`MAIL_MAILER`, etc.).
- `is_admin` bootstrapping: the **first** registered user bypasses invite gating, then is promoted
  to admin via Tinker. Subsequent registrations require a code.

---

## Backend — 12 changes

### 1. Migration: `add_is_admin_to_users_table`

```bash
php artisan make:migration add_is_admin_to_users_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_admin')->default(false)->after('household_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('is_admin');
        });
    }
};
```

### 2. Migration: `create_invite_codes_table`

```bash
php artisan make:migration create_invite_codes_table
```

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('invite_codes', function (Blueprint $table) {
            $table->id();
            $table->string('code', 12)->unique();
            $table->string('note')->nullable();
            $table->string('sent_to_email')->nullable();
            $table->timestamp('used_at')->nullable();
            $table->foreignId('used_by_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('invite_codes');
    }
};
```

Run: `php artisan migrate`

### 3. `app/Models/User.php` — add `is_admin`

Add `is_admin` to `$fillable` and to `$casts`:

```php
protected $fillable = [
    'household_id',
    'is_admin',
    'name',
    'email',
    'password',
];

protected function casts(): array
{
    return [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'is_admin' => 'boolean',
    ];
}
```

### 4. `app/Models/InviteCode.php` — new model

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class InviteCode extends Model
{
    protected $fillable = [
        'code',
        'note',
        'sent_to_email',
        'used_at',
        'used_by_user_id',
    ];

    protected function casts(): array
    {
        return [
            'used_at' => 'datetime',
        ];
    }

    public function usedBy()
    {
        return $this->belongsTo(User::class, 'used_by_user_id');
    }
}
```

### 5. `app/Http/Middleware/EnsureUserIsAdmin.php` — new middleware

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserIsAdmin
{
    public function handle(Request $request, Closure $next): Response
    {
        if (! $request->user()?->is_admin) {
            return response()->json(['message' => 'Forbidden'], 403);
        }

        return $next($request);
    }
}
```

### 6. `bootstrap/app.php` — register `ensure.admin` alias

Add the alias inside `->withMiddleware()`:

```php
->withMiddleware(function (Middleware $middleware): void {
    $middleware->alias([
        // ... existing aliases ...
        'ensure.admin' => \App\Http\Middleware\EnsureUserIsAdmin::class,
    ]);
})
```

### 7. `app/Mail/InviteCodeMail.php` — new mailable

```php
<?php

namespace App\Mail;

use App\Models\InviteCode;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class InviteCodeMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(public InviteCode $inviteCode) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: "You've been invited to " . config('app.name'),
        );
    }

    public function content(): Content
    {
        return new Content(
            markdown: 'mail.invite-code',
        );
    }
}
```

### 8. `resources/views/mail/invite-code.blade.php` — email template

```blade
@component('mail::message')
# You've Been Invited

You've been invited to join **{{ config('app.name') }}** — a home inventory management app.

Use the invite code below to create your account:

@component('mail::panel')
**{{ $inviteCode->code }}**
@endcomponent

@component('mail::button', ['url' => rtrim(config('app.frontend_url', config('app.url')), '/') . '/register?code=' . $inviteCode->code])
Register Now
@endcomponent

Or go to **/register** and enter the code manually.

Thanks,
{{ config('app.name') }}
@endcomponent
```

### 9. `app/Http/Resources/InviteCodeResource.php` — API resource

```php
<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InviteCodeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'code' => $this->code,
            'note' => $this->note,
            'sent_to_email' => $this->sent_to_email,
            'is_used' => $this->used_at !== null,
            'used_at' => $this->used_at?->toISOString(),
            'used_by' => $this->whenLoaded('usedBy', fn () => $this->usedBy ? [
                'name' => $this->usedBy->name,
                'email' => $this->usedBy->email,
            ] : null),
            'created_at' => $this->created_at->toISOString(),
        ];
    }
}
```

### 10. `app/Http/Controllers/Api/InviteCodeController.php` — CRUD controller

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\InviteCodeResource;
use App\Mail\InviteCodeMail;
use App\Models\InviteCode;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;

class InviteCodeController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $codes = InviteCode::with('usedBy')
            ->orderByDesc('created_at')
            ->get();

        return InviteCodeResource::collection($codes);
    }

    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'note' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email', 'max:255'],
        ]);

        $code = InviteCode::create([
            'code' => strtoupper(Str::random(5)) . '-' . strtoupper(Str::random(5)),
            'note' => $request->note,
            'sent_to_email' => $request->email,
        ]);

        if ($request->filled('email')) {
            Mail::to($request->email)->send(new InviteCodeMail($code));
        }

        return (new InviteCodeResource($code->load('usedBy')))->response()->setStatusCode(201);
    }

    public function destroy(InviteCode $inviteCode): Response
    {
        if ($inviteCode->used_at !== null) {
            abort(422, 'Cannot delete a used invite code');
        }

        $inviteCode->delete();

        return response()->noContent();
    }
}
```

### 11. `routes/api.php` — add admin-gated invite code routes

Add inside the `auth:sanctum` middleware group:

```php
// Admin-only routes
Route::middleware(['ensure.admin'])->group(function () {
    Route::get('/invite-codes', [InviteCodeController::class, 'index']);
    Route::post('/invite-codes', [InviteCodeController::class, 'store']);
    Route::delete('/invite-codes/{inviteCode}', [InviteCodeController::class, 'destroy']);
});
```

Add the import at the top:

```php
use App\Http\Controllers\Api\InviteCodeController;
```

### 12. `app/Http/Controllers/Auth/RegisteredUserController.php` — validate invite code

Add the invite code check after the basic field validation, before creating the user.
The check is skipped when `INVITE_CODES_REQUIRED=false` or when no users exist yet
(first-user bootstrapping).

```php
<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Household;        // adapt if your project has a different household model
use App\Models\InviteCode;
use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules;
use Illuminate\Validation\ValidationException;

class RegisteredUserController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'household_name' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'string', 'lowercase', 'email', 'max:255', 'unique:'.User::class],
            'password' => ['required', 'confirmed', Rules\Password::defaults()],
        ]);

        // Invite code check — skipped when disabled via env or when no users exist (bootstrapping)
        $inviteCode = null;
        if (config('app.invite_codes_required', true) && User::count() > 0) {
            $request->validate(['invite_code' => ['required', 'string']]);
            $inviteCode = InviteCode::where('code', $request->invite_code)
                ->whereNull('used_at')
                ->first();
            if (! $inviteCode) {
                throw ValidationException::withMessages([
                    'invite_code' => ['This invite code is invalid or has already been used.'],
                ]);
            }
        }

        // Create household (adapt this to your project's household creation method)
        $household = Household::create(['name' => $request->household_name]);

        // Create user linked to household
        $user = User::create([
            'household_id' => $household->id,
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->string('password')),
        ]);

        // Mark invite code as used
        $inviteCode?->update([
            'used_at' => now(),
            'used_by_user_id' => $user->id,
        ]);

        event(new Registered($user));

        $token = $user->createToken('auth-token')->plainTextToken;

        return response()->json([
            'user' => $user->load('household'),
            'token' => $token,
        ], 201);
    }
}
```

### 13. `config/app.php` — add `invite_codes_required`

```php
'invite_codes_required' => env('INVITE_CODES_REQUIRED', true),
```

### 14. `.env.example` — add `INVITE_CODES_REQUIRED`

```dotenv
INVITE_CODES_REQUIRED=true
```

---

## Frontend — 6 changes

### 1. `resources/js/stores/inviteCodes.js` — new Pinia store

```js
import { defineStore } from 'pinia'
import axios from '../api/axios'

export const useInviteCodesStore = defineStore('inviteCodes', {
  state: () => ({
    codes: [],
    loading: false,
    error: null,
  }),

  actions: {
    async fetchCodes() {
      this.loading = true
      this.error = null
      try {
        const response = await axios.get('/invite-codes')
        this.codes = response.data.data
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to load invite codes'
        throw error
      } finally {
        this.loading = false
      }
    },

    async createCode({ note, email } = {}) {
      this.error = null
      try {
        const response = await axios.post('/invite-codes', { note, email })
        const code = response.data.data
        this.codes.unshift(code)
        return code
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to create invite code'
        throw error
      }
    },

    async deleteCode(id) {
      this.error = null
      try {
        await axios.delete(`/invite-codes/${id}`)
        this.codes = this.codes.filter((c) => c.id !== id)
      } catch (error) {
        this.error = error.response?.data?.message || 'Failed to delete invite code'
        throw error
      }
    },
  },
})
```

### 2. `resources/js/views/auth/Register.vue` — add invite code field

Add the `invite_code` field at the top of the form and pre-fill it from the `?code=` query param.

In `<script setup>`:

```js
import { reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '../../stores/auth'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const form = reactive({
  invite_code: route.query.code || '',   // ← pre-fill from email link
  household_name: '',
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
})

const handleRegister = async () => {
  if (form.password !== form.password_confirmation) {
    authStore.error = 'Passwords do not match'
    return
  }

  try {
    await authStore.register({
      invite_code: form.invite_code,
      household_name: form.household_name,
      name: form.name,
      email: form.email,
      password: form.password,
      password_confirmation: form.password_confirmation,
    })
    router.push('/')
  } catch (error) {
    console.error('Registration failed:', error)
  }
}
```

In `<template>`, add the invite code input as the **first** field in the form:

```vue
<div>
  <label for="invite-code" class="block text-sm font-semibold text-slate-300 mb-2">
    Invite Code
  </label>
  <input
    id="invite-code"
    v-model="form.invite_code"
    type="text"
    class="input font-mono tracking-widest uppercase"
    placeholder="XXXXX-XXXXX"
    autocomplete="off"
  />
</div>
```

Note: The field is not `required` in HTML — the backend enforces it (or skips it) based on
`INVITE_CODES_REQUIRED` and whether any users exist.

### 3. `resources/js/router/index.js` — add admin route with guard

Add the `/admin` route to the routes array:

```js
{
  path: '/admin',
  name: 'admin',
  component: () => import('../views/admin/AdminPanel.vue'),
  meta: { requiresAuth: true, requiresAdmin: true }
},
```

Add `requiresAdmin` handling to the navigation guard:

```js
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('auth_token')
  const isAuthenticated = !!token

  if (to.meta.requiresAuth && !isAuthenticated) {
    next('/login')
  } else if (to.meta.requiresGuest && isAuthenticated) {
    next('/')
  } else if (to.meta.requiresAdmin) {
    const user = JSON.parse(localStorage.getItem('user'))
    if (!isAuthenticated || !user?.is_admin) {
      next('/')
    } else {
      next()
    }
  } else {
    next()
  }
})
```

### 4. Sidebar component — conditional Admin link

In whatever component renders your sidebar navigation, import `IconShield` and add the Admin
nav item conditionally based on `authStore.user?.is_admin`:

```js
import { useAuthStore } from '../../stores/auth'
import { IconShield } from '../common/Icons.vue'  // adjust import path

const authStore = useAuthStore()

const navItems = computed(() => [
  // ... your existing nav items ...
  ...(authStore.user?.is_admin
    ? [{ name: 'Admin', to: '/admin', icon: IconShield }]
    : []),
])
```

### 5. `resources/js/components/common/Icons.vue` — add `IconShield`

Add this export to your icons file (alongside existing icon exports):

```js
export const IconShield = {
  template: `
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  `
}
```

### 6. `resources/js/views/admin/AdminPanel.vue` — new Admin page

```vue
<template>
  <div class="max-w-3xl mx-auto px-4 py-8 space-y-8">
    <h1 class="text-2xl font-bold text-white">Admin Panel</h1>

    <!-- Send Invite Card -->
    <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6">
      <h2 class="text-lg font-semibold text-white mb-5">Send Invite</h2>

      <form class="space-y-4" @submit.prevent="handleCreate">
        <div v-if="successMessage" class="rounded-xl bg-emerald-900/50 border border-emerald-700 p-4">
          <p class="text-sm text-emerald-300 font-medium">{{ successMessage }}</p>
          <p v-if="newCode" class="text-emerald-200 font-mono font-bold text-lg mt-1">{{ newCode }}</p>
        </div>

        <div v-if="inviteCodesStore.error" class="rounded-xl bg-red-900/50 border border-red-700 p-4">
          <p class="text-sm text-red-300 font-medium">{{ inviteCodesStore.error }}</p>
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">
            Recipient Email <span v-if="!emailOptional" class="text-slate-400 font-normal">(required to send)</span>
            <span v-else class="text-slate-400 font-normal">(optional)</span>
          </label>
          <input
            v-model="form.email"
            type="email"
            :required="!emailOptional"
            class="input"
            placeholder="friend@example.com"
          />
        </div>

        <div>
          <label class="block text-sm font-semibold text-slate-300 mb-2">
            Label / Note <span class="text-slate-400 font-normal">(optional, e.g. "For Mom")</span>
          </label>
          <input
            v-model="form.note"
            type="text"
            class="input"
            placeholder="For Mom"
          />
        </div>

        <div class="flex items-center justify-between pt-1">
          <button
            type="submit"
            :disabled="sending"
            class="btn-primary"
          >
            <span v-if="!sending">{{ emailOptional ? 'Generate Code' : 'Send Invite' }}</span>
            <span v-else class="flex items-center gap-2">
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {{ emailOptional ? 'Generating...' : 'Sending...' }}
            </span>
          </button>

          <button
            type="button"
            class="text-sm text-sky-400 hover:text-sky-300 transition-colors"
            @click="emailOptional = !emailOptional"
          >
            {{ emailOptional ? 'Back to Send Invite' : 'Generate Without Email' }}
          </button>
        </div>
      </form>
    </div>

    <!-- Invite Codes List Card -->
    <div class="bg-slate-800 rounded-2xl border border-slate-700 p-6">
      <h2 class="text-lg font-semibold text-white mb-5">Invite Codes</h2>

      <div v-if="inviteCodesStore.loading" class="text-slate-400 text-sm py-4 text-center">
        Loading...
      </div>

      <div v-else-if="inviteCodesStore.codes.length === 0" class="text-slate-500 text-sm py-4 text-center">
        No invite codes yet.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="code in inviteCodesStore.codes"
          :key="code.id"
          class="flex items-start justify-between gap-4 rounded-xl p-4"
          :class="code.is_used ? 'bg-slate-700/40' : 'bg-slate-700/70'"
        >
          <div class="min-w-0 flex-1">
            <div class="flex items-center gap-3 flex-wrap">
              <span
                class="font-mono font-bold tracking-widest text-sm"
                :class="code.is_used ? 'text-slate-500' : 'text-white'"
              >{{ code.code }}</span>
              <span v-if="code.is_used" class="text-xs px-2 py-0.5 rounded-full bg-slate-600 text-slate-400">Used</span>
              <span v-else class="text-xs px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-400 border border-emerald-800">Unused</span>
            </div>

            <div v-if="code.note" class="text-xs text-slate-400 mt-1">{{ code.note }}</div>

            <div v-if="code.is_used" class="text-xs text-slate-500 mt-1">
              Used by {{ code.used_by?.name }} ({{ code.used_by?.email }}) on {{ formatDate(code.used_at) }}
            </div>
            <div v-else-if="code.sent_to_email" class="text-xs text-slate-400 mt-1">
              Sent to {{ code.sent_to_email }}
            </div>
          </div>

          <div v-if="!code.is_used" class="flex items-center gap-2 shrink-0">
            <button
              type="button"
              class="text-xs px-3 py-1.5 rounded-lg bg-slate-600 hover:bg-slate-500 text-slate-200 transition-colors"
              @click="copyCode(code.code)"
            >
              {{ copiedCode === code.code ? 'Copied!' : 'Copy' }}
            </button>
            <button
              type="button"
              class="text-xs px-3 py-1.5 rounded-lg bg-red-900/50 hover:bg-red-800/60 text-red-300 transition-colors border border-red-800/50"
              @click="handleDelete(code.id)"
            >
              Delete
            </button>
          </div>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useInviteCodesStore } from '../../stores/inviteCodes'

const inviteCodesStore = useInviteCodesStore()

const form = ref({ email: '', note: '' })
const emailOptional = ref(false)
const sending = ref(false)
const successMessage = ref('')
const newCode = ref('')
const copiedCode = ref('')

onMounted(() => {
  inviteCodesStore.fetchCodes()
})

const handleCreate = async () => {
  sending.value = true
  successMessage.value = ''
  newCode.value = ''
  inviteCodesStore.error = null

  try {
    const code = await inviteCodesStore.createCode({
      email: form.value.email || null,
      note: form.value.note || null,
    })

    newCode.value = code.code
    if (form.value.email) {
      successMessage.value = `Invite sent to ${form.value.email}!`
    } else {
      successMessage.value = 'Invite code generated:'
    }
    form.value = { email: '', note: '' }
  } catch {
    // error is set on store
  } finally {
    sending.value = false
  }
}

const handleDelete = async (id) => {
  if (!confirm('Delete this invite code?')) return
  try {
    await inviteCodesStore.deleteCode(id)
  } catch {
    // error is set on store
  }
}

const copyCode = async (code) => {
  try {
    await navigator.clipboard.writeText(code)
    copiedCode.value = code
    setTimeout(() => {
      if (copiedCode.value === code) copiedCode.value = ''
    }, 2000)
  } catch {
    // clipboard not available
  }
}

const formatDate = (iso) => {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
}
</script>
```

---

## Bootstrapping: first-use setup

1. **Register the first user** — no invite code required (backend skips check when `User::count() === 0`).

2. **Promote that user to admin** via Tinker:
   ```bash
   php artisan tinker
   >>> User::first()->update(['is_admin' => true])
   ```

3. **Log back in** — the frontend re-fetches user data on login and stores it in localStorage,
   so the Admin nav item will appear after the next login. To see it immediately without
   re-logging in, call `authStore.fetchUser()` or just refresh.

4. **Generate an invite code** from the Admin panel (or with email to send it directly).

5. All subsequent registrations now require a valid unused code.

---

## Disabling invite gating (open registration)

Set in `.env`:

```dotenv
INVITE_CODES_REQUIRED=false
```

The invite code field on the registration form is not `required` in HTML, so users can leave it
blank. The backend skips validation when the flag is false.

---

## Verification checklist

- [ ] First user can register without a code
- [ ] After promoting first user to admin, the Admin nav item appears in the sidebar
- [ ] Admin panel loads the invite codes list
- [ ] Generating a code without email shows the code in the success banner
- [ ] Generating a code with email sends it (check `storage/logs/laravel.log` when `MAIL_MAILER=log`)
- [ ] The email link points to `/register?code=XXXXX-XXXXX` and pre-fills the invite code field
- [ ] A second user can register using a valid code; code is marked as Used afterward
- [ ] Attempting to reuse the same code shows "invalid or already used" error
- [ ] A non-admin user cannot access `GET /api/invite-codes` (returns 403)
- [ ] `/admin` route redirects to `/` for non-admin users
- [ ] A used code cannot be deleted (backend returns 422)
- [ ] Setting `INVITE_CODES_REQUIRED=false` allows registration without a code
