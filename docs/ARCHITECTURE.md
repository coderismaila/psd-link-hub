# Architecture — PSD Link Hub

## 1. Setup

```bash
pnpm create nuxt@latest psd-link-hub     # Nuxt 4, choose pnpm
cd psd-link-hub
pnpm add @nuxt/ui @nuxthub/core nuxt-auth-utils drizzle-orm @libsql/client zod vue-draggable-plus @vueuse/nuxt
pnpm add -D drizzle-kit @nuxt/eslint
```

```ts
// nuxt.config.ts
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  modules: ['@nuxt/ui', '@nuxthub/core', 'nuxt-auth-utils', '@vueuse/nuxt', '@nuxt/eslint'],
  css: ['~/assets/css/main.css'],
  hub: { db: 'sqlite' },            // local file: .data/db/sqlite.db (libsql)
  runtimeConfig: {
    adminEmail: '', adminPassword: '', adminName: 'Administrator',
    public: { appTimezone: 'UTC' },
  },
  nitro: {
    experimental: { tasks: true },
    scheduledTasks: { '15 0 * * *': ['archive:monthly'] }, // daily 00:15 server time
  },
})
```

```css
/* app/assets/css/main.css */
@import "tailwindcss";
@import "@nuxt/ui";
```

`app/app.vue` must wrap everything in `<UApp>` (toasts, modals, tooltips depend on it).

> Deployment note: scheduled tasks need a long-running Node server or a platform with cron
> support. The lazy fallback in §5 keeps auto-archive working even where cron isn't available.

## 2. Database schema (`server/db/schema.ts`)

```ts
import { sqliteTable, text, integer, index, primaryKey } from 'drizzle-orm/sqlite-core'

const timestamps = {
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}

export const users = sqliteTable('users', {
  id: integer().primaryKey({ autoIncrement: true }),
  email: text().notNull().unique(),              // store lower-cased
  name: text().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text({ enum: ['admin', 'viewer'] }).notNull().default('viewer'),
  isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  ...timestamps,
})

export const categories = sqliteTable('categories', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull().unique(),
  color: text().notNull().default('#475569'),    // hex, picked from a palette of swatches
  ...timestamps,
})

export const links = sqliteTable('links', {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull().default(''),
  url: text().notNull(),
  categoryId: integer('category_id').notNull().references(() => categories.id, { onDelete: 'restrict' }),
  periodType: text('period_type', { enum: ['monthly', 'yearly'] }).notNull(),
  periodYear: integer('period_year').notNull(),
  periodMonth: integer('period_month'),          // 1–12 when monthly, null when yearly
  status: text({ enum: ['active', 'archived'] }).notNull().default('active'),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  archivedBy: text('archived_by', { enum: ['system', 'admin'] }),
  archivedByUserId: integer('archived_by_user_id').references(() => users.id, { onDelete: 'set null' }),
  createdBy: integer('created_by').references(() => users.id, { onDelete: 'set null' }),
  ...timestamps,
}, t => [
  index('links_status_idx').on(t.status),
  index('links_category_idx').on(t.categoryId),
  index('links_period_idx').on(t.periodYear, t.periodMonth),
])

export const userLinkPrefs = sqliteTable('user_link_prefs', {
  userId: integer('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  linkId: integer('link_id').notNull().references(() => links.id, { onDelete: 'cascade' }),
  // Columns keep their original names; the feature was renamed to "quick access" later.
  isQuickAccess: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
  quickAccessOrder: integer('favorite_order'),   // gaps allowed; sort ASC NULLS LAST
  isArchived: integer('is_archived', { mode: 'boolean' }).notNull().default(false),
  archivedAt: integer('archived_at', { mode: 'timestamp' }),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdateFn(() => new Date()),
}, t => [
  primaryKey({ columns: [t.userId, t.linkId] }),
  index('prefs_user_fav_idx').on(t.userId, t.isQuickAccess),
])

export const settings = sqliteTable('settings', {
  key: text().primaryKey(),
  value: text().notNull(),                       // JSON-encoded
  updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
})
```

Settings keys and defaults (`server/utils/settings.ts` exposes typed `getSettings()` / `updateSettings()`):

| key                     | type                  | default |
|-------------------------|-----------------------|---------|
| `archive.mode`          | `'auto' \| 'manual'`  | `'auto'` |
| `archive.graceDays`     | number 0–31           | `3` |
| `archive.includeYearly` | boolean               | `false` |
| `archive.lastRunAt`     | ISO string \| null    | `null` |

Upserts on prefs/settings use `.onConflictDoUpdate({ target: [...], set: {...} })`.

## 3. Auth (`nuxt-auth-utils`)

```ts
// shared/types/auth.d.ts
declare module '#auth-utils' {
  interface User { id: number, name: string, email: string, role: 'admin' | 'viewer' }
}
export {}
```

- `POST /api/auth/login` → find user by lower-cased email, `verifyPassword(hash, password)`,
  reject if `!isActive`, then `setUserSession(event, { user: {...}, loggedInAt: Date.now() })`.
  Same generic 401 message for "no user" and "bad password".
- Logout on the client: `const { clear } = useUserSession(); await clear(); navigateTo('/login')`.
- `server/utils/auth.ts`:
  - `requireAuthUser(event)` → `requireUserSession(event)`, then reload the user row from DB;
    if missing or inactive → `clearUserSession` + 401. If role changed, refresh the session. Returns the DB user.
  - `requireAdmin(event)` → `requireAuthUser` + 403 unless `role === 'admin'`.
- `app/middleware/auth.global.ts` → redirect to `/login` when `!loggedIn` (skip `/login`); redirect logged-in users away from `/login`.
- `app/middleware/admin.ts` → `navigateTo('/')` unless `user.role === 'admin'`. Admin pages use `definePageMeta({ middleware: 'admin' })`.
- Passwords: `hashPassword()` on create/reset; min length 8 (zod).

## 4. API

All handlers call an auth guard first. Response shapes are typed in `shared/types`.

| Method & path | Guard | Purpose |
|---|---|---|
| POST `/api/auth/login` | public | Log in |
| GET `/api/links` | user | Active links merged with caller's prefs. Query: `q, categoryId, periodType, year, month`. Excludes global-archived and caller's personal-archived. Calls `maybeRunAutoArchive()` first. |
| GET `/api/links/quick-access` | user | Caller's pinned links (active only), ordered by `quickAccessOrder` |
| GET `/api/links/archived` | user | Query `scope=mine\|global` + same filters |
| POST `/api/links` | admin | Create (`createdBy` = caller) |
| PATCH `/api/links/[id]` | admin | Update |
| DELETE `/api/links/[id]` | admin | Delete (prefs cascade) |
| POST `/api/links/[id]/archive` | admin | Global archive (`archivedBy='admin'`) |
| POST `/api/links/[id]/restore` | admin | Global restore |
| PUT `/api/links/[id]/quick-access` | user | Body `{ pinned: boolean }`. On true, `quickAccessOrder = max+1` |
| PUT `/api/links/[id]/personal-archive` | user | Body `{ archived: boolean }`. Archiving also unpins |
| PUT `/api/quick-access/order` | user | Body `{ linkIds: number[] }` → rewrite `quickAccessOrder` (index * 10) in one transaction/batch |
| GET `/api/categories` | user | List with `linkCount` |
| POST / PATCH / DELETE `/api/categories[/id]` | admin | CRUD; DELETE → 409 if `linkCount > 0` |
| GET / POST `/api/admin/users` | admin | List (never include `passwordHash`) / create |
| PATCH `/api/admin/users/[id]` | admin | name, role, isActive (self & last-admin protections) |
| POST `/api/admin/users/[id]/reset-password` | admin | Set new password |
| GET / PUT `/api/admin/settings` | admin | Archive settings |
| POST `/api/admin/archive/run` | admin | Run archive now → `{ archived: number }` |
| GET `/api/admin/archive/overdue` | admin | Links past their archive date (for manual mode) |

## 5. Archive logic

`shared/utils/period.ts` (pure, unit-tested):
- `periodLabel(link)` → `"Sep 2026"` / `"2026"`
- `archiveDueDate(link, graceDays)` → monthly: first day of month after `(year, month)` + graceDays; yearly: 1 Jan of `year+1` + graceDays. Computed as a calendar date in `appTimezone`.
- `isArchiveDue(link, graceDays, now, tz)` → compares *calendar dates* in the timezone, not UTC instants.

`server/utils/archive.ts`:
- `runAutoArchive({ force? })` → reads settings; if `mode === 'manual'` and not forced, return 0.
  Select active links (monthly, plus yearly if enabled), filter with `isArchiveDue`, update
  `status='archived', archivedAt=now, archivedBy='system'`. Set `archive.lastRunAt`. Idempotent.
- `maybeRunAutoArchive()` → if mode is auto and `lastRunAt` older than 1 hour, run it. Called from `GET /api/links` so the app self-heals without cron.
- `server/tasks/archive/monthly.ts` → `defineTask({ meta: { name: 'archive:monthly' }, run: () => runAutoArchive() })`.

## 6. Pages & layout

| Route | Layout | Content |
|---|---|---|
| `/login` | auth | UCard + UForm (email, password) |
| `/` | default | Quick access bar (top) + filters + link grid. One page at every width |
| `/archive` | default | UTabs: Archived by me / Archived for everyone |
| `/admin/links` | default | UTable with actions, "New link" → `LinkFormModal` |
| `/admin/categories` | default | UTable + inline create/edit modal |
| `/admin/users` | default | UTable + create/edit slideover |
| `/admin/settings` | default | UForm: mode (URadioGroup), grace days (UInputNumber), include yearly (USwitch), Run now |

`layouts/default.vue`: `UDashboardGroup` → `UDashboardSidebar` (collapsible, `UNavigationMenu`,
admin section only when `user.role === 'admin'`, user menu with colour-mode toggle + logout at the bottom)
→ `<slot />` inside `UDashboardPanel` with `UDashboardNavbar`. The sidebar turns into a drawer on mobile automatically.

## 7. Components

- `LinkCard.vue` — card for the grid; props `link: LinkWithPrefs`; emits `toggle-quick-access`, `archive-mine`, `edit`, `archive-global`, `delete`. No drag handle: cards are never dragged.
- `LinkList.vue` — responsive grid of `LinkCard`s. A plain list, not a drag source.
- `QuickAccessBar.vue` — compact tiles above the list; reorder-only `VueDraggable`. Empty state "Nothing pinned yet".
- `LinkFilters.vue` — UInput search (debounced 250 ms), category colour chips, URadioGroup segments for period type and year, USelectMenu for month; synced to route query.
- `LinkFormModal.vue` — UModal + UForm with zod schema from `shared/schemas/link.ts`.
- `CategoryBadge.vue`, `PeriodBadge.vue`, `EmptyState.vue`, `ConfirmModal.vue`.

## 8. Quick access and reordering (`vue-draggable-plus`)

Quick access is a launcher, not a second catalog. A link appears once on the page — as a card in the
list — and favoriting pins a compact tile to the bar above it. Dragging is used for one thing only:
putting those tiles in the order the user wants.

```vue
<!-- QuickAccessBar.vue: reorder only — nothing enters or leaves by drag -->
<VueDraggable v-model="quickAccess" :group="{ name: 'quick-access', pull: false, put: false }"
  handle=".drag-handle" :delay="150" :delay-on-touch-only="true"
  @update="handleReorder" ghost-class="opacity-40">
```

- `handleReorder()`: `PUT /api/quick-access/order` with the current id list.
- `toggleQuickAccess(link)`: the pin on a card, the only way in or out of the bar.
- `moveQuickAccess(link, ±1)`: "Move earlier / Move later" in the tile menu — the same result without
  a pointer.
- All in `useQuickAccess()`, applied locally first and refetched on failure with a toast. The cached
  browse list has its row replaced (not mutated) so the card's star updates: Nuxt 4 returns
  `useFetch` data in a shallow ref, which ignores nested writes.

## 9. Shared types

```ts
export type Link = typeof schema.links.$inferSelect            // server side
export interface LinkWithPrefs extends LinkDTO {
  category: { id: number, name: string, color: string }
  isQuickAccess: boolean
  quickAccessOrder: number | null
  isPersonallyArchived: boolean
  periodLabel: string
}
```
Serialize dates as ISO strings in DTOs.
