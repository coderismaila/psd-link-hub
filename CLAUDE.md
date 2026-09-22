# PSD Link Hub — Project Guide for Claude

An MVP web app for managing Google Sheet links used in daily dispatch operations.
Some links are generated **monthly**, others live for a **year**. Monthly links can be
auto-archived a few days after their month ends. Users keep their own **favorites**
(star or drag-and-drop) and their own **personal archive**.

Read these before starting any non-trivial task:
- `docs/PRD.md` — requirements, roles, acceptance criteria (source of truth for *what*)
- `docs/ARCHITECTURE.md` — schema, API, pages, components, archive logic (source of truth for *how*)
- `docs/IMPLEMENTATION_PLAN.md` — phased checklist; tick items off as you finish them

## Tech stack (do not substitute)

| Concern        | Choice |
|----------------|--------|
| Framework      | Nuxt 4 (`app/` directory structure), TypeScript strict |
| UI             | Nuxt UI v4 (`@nuxt/ui`) + Tailwind CSS v4, Lucide icons (`i-lucide-*`) |
| Auth           | `nuxt-auth-utils` (sealed cookie sessions, `hashPassword` / `verifyPassword`) |
| Database       | SQLite via NuxtHub (`@nuxthub/core`, `hub: { db: 'sqlite' }`) + Drizzle ORM |
| Validation     | Zod (schemas in `shared/schemas/`, used by both client forms and server handlers) |
| Drag and drop  | `vue-draggable-plus` (SortableJS — works with touch on mobile) |
| Package mgr    | pnpm |

If a library API seems different from what is written here, **check the live docs first**
(Nuxt UI and Nuxt MCP servers are configured in `.mcp.json`) rather than guessing.
NuxtHub changed its DB API in v0.10 — never use the old `hubDatabase()` / `server/database/` pattern.

## Commands

```bash
pnpm dev                 # dev server (applies pending migrations automatically)
pnpm build && pnpm preview
pnpm lint                # eslint (@nuxt/eslint)
pnpm typecheck           # nuxi typecheck
npx nuxt db generate     # generate migration after editing server/db/schema.ts
npx nuxt db migrate      # apply migrations
```
Seed the first admin: run the `db:seed` Nitro task (Nuxt DevTools → Tasks, or
`curl -X POST http://localhost:3000/_nitro/tasks/db:seed` in dev). It reads
`NUXT_ADMIN_EMAIL` / `NUXT_ADMIN_PASSWORD` from `.env`.

## Directory layout

```
app/
  app.vue                 # <UApp> wrapper
  assets/css/main.css     # @import "tailwindcss"; @import "@nuxt/ui";
  layouts/default.vue     # UDashboardGroup + sidebar (collapsible, mobile drawer)
  layouts/auth.vue        # centered card for /login
  middleware/auth.global.ts, admin.ts
  pages/                  # index (links + favorites), archive, login, admin/*
  components/links/*      # LinkCard, LinkList, FavoritesZone, LinkFilters, LinkFormModal
  composables/            # useLinks, useFavorites, useCategories, useAppSettings
server/
  api/                    # REST handlers (see ARCHITECTURE.md §4)
  db/schema.ts            # Drizzle schema — single source of truth for tables
  db/migrations/sqlite/   # generated, never hand-edit
  tasks/                  # db:seed, archive:monthly
  utils/                  # auth guards, archive logic, period helpers
shared/
  schemas/                # zod schemas (link, category, user, settings)
  types/                  # shared TS types (auto-imported in app + server)
  utils/period.ts         # period labels & end-of-period math (pure functions)
```

## Conventions

- **Server DB access:** `import { db, schema } from '@nuxthub/db'` and `import { eq, and, ... } from 'drizzle-orm'`.
- **Every API handler starts with an auth guard:** `requireAuthUser(event)` or `requireAdmin(event)`
  (in `server/utils/auth.ts`). Never trust role from the client; never rely on page middleware alone.
- **Validate input** with `readValidatedBody(event, schema.parse)` / `getValidatedQuery` using zod schemas from `shared/schemas`.
- **Errors:** `throw createError({ statusCode, statusMessage })`. Client shows them via `useToast()`.
- **Dates:** store as Drizzle `integer({ mode: 'timestamp' })`. All period/archive math goes through
  `shared/utils/period.ts` using the configured timezone (`NUXT_PUBLIC_APP_TIMEZONE`).
- **Per-user state** (favorite, favorite order, personal archive) lives in `user_link_prefs` — never on `links`.
- **Global archive** (`links.status = 'archived'`) is admin/system only. Viewers only touch their own prefs.
- **UI:** use Nuxt UI components before writing custom ones (UDashboard*, UTable, UForm, UModal,
  USlideover, USelectMenu, UTabs, UBadge, UDropdownMenu). Theme via `app.config.ts` (`ui.colors`).
- **Responsive:** design mobile-first; verify at 375px, 768px, 1280px. Tables collapse to cards on mobile.
- **Optimistic UI** for star / reorder / archive, with rollback + toast on failure.
- Keep components < ~200 lines; extract composables for data logic.
- No `any`. Export types from `shared/types`. Infer DB types with `typeof schema.links.$inferSelect`.

## Guardrails

- Do not add a public sign-up route. Only admins create users.
- Do not store plaintext passwords or return `passwordHash` from any endpoint.
- Do not hand-edit generated migrations; change `schema.ts` and regenerate.
- Do not delete `.data/` (local SQLite file) without asking.
- Ask before adding a new dependency not listed above.
- After each phase: run `pnpm lint && pnpm typecheck`, then update the checklist in `docs/IMPLEMENTATION_PLAN.md`.
