# Implementation Plan

Work one phase at a time. At the end of each phase: `pnpm lint && pnpm typecheck`, manual check
at 375px and 1280px, tick the boxes, commit. Use `/next-phase` to continue.

## Phase 0 — Scaffold
- [x] Nuxt 4 app with pnpm; install deps from ARCHITECTURE.md §1
- [x] `nuxt.config.ts`, `main.css`, `app.vue` with `<UApp>`, `app.config.ts` (primary colour)
- [x] `.env` from `.env.example`; `NUXT_SESSION_PASSWORD` set
- [x] ESLint configured; `lint` and `typecheck` scripts in package.json
- [x] Dev server boots with a placeholder page

## Phase 1 — Database
- [x] `server/db/schema.ts` exactly as ARCHITECTURE.md §2
- [x] `npx nuxt db generate` → migration committed
- [x] `server/utils/settings.ts` typed getters/setters with defaults
- [x] `db:seed` task: first admin from env (skip if any admin exists) + 3 sample categories + 4 sample links (2 monthly: last month & this month; 2 yearly)
- [x] Verify tables in Nuxt DevTools → Database

## Phase 2 — Auth
- [ ] `#auth-utils` User type augmentation
- [ ] `POST /api/auth/login`; `server/utils/auth.ts` (`requireAuthUser`, `requireAdmin`)
- [ ] `auth.global.ts` + `admin.ts` middleware
- [ ] `/login` page (auth layout), logout from user menu
- [ ] Deactivated user is logged out on next request

## Phase 3 — Layout & read-only browsing
- [ ] `layouts/default.vue` with UDashboard components, role-aware nav, colour-mode toggle
- [ ] `shared/utils/period.ts` + zod schemas in `shared/schemas`
- [ ] `GET /api/categories`, `GET /api/links` (filters, prefs merge)
- [ ] `LinkFilters`, `LinkCard`, `LinkList`; filters synced to URL
- [ ] Open (new tab) + copy link; empty & loading states (USkeleton)

## Phase 4 — Favorites
- [ ] Favorite / order endpoints; `GET /api/links/favorites`
- [ ] `useFavorites()` with optimistic updates + rollback toasts
- [ ] Star toggle on cards
- [ ] `FavoritesZone` with drag-in from list and reorder (vue-draggable-plus), touch tested
- [ ] Mobile: UTabs Favorites / All

## Phase 5 — Admin: links & categories
- [ ] Link CRUD endpoints + `LinkFormModal` (category dropdown, period fields, Sheets URL warning)
- [ ] "Duplicate for next period"
- [ ] Category CRUD endpoints + `/admin/categories` (delete blocked when in use)
- [ ] `/admin/links` table (cards on mobile)

## Phase 6 — Archive
- [ ] Personal archive endpoint + "Archive for me" action
- [ ] Global archive / restore endpoints (admin)
- [ ] `runAutoArchive`, `maybeRunAutoArchive`, `archive:monthly` scheduled task
- [ ] `/archive` page with both tabs and restore actions
- [ ] `/admin/settings` (mode, grace days, include yearly, run now, last run, overdue list in manual mode)
- [ ] Unit tests for `period.ts` (month end, December → January, grace 0, timezone edge)

## Phase 7 — Admin: users
- [ ] Users endpoints (no `passwordHash` in responses) + self/last-admin protections
- [ ] `/admin/users` table + create/edit slideover + reset password

## Phase 8 — Polish
- [ ] Responsive pass at 375 / 768 / 1280; dark mode pass
- [ ] Keyboard access for favorites (menu move up/down), focus states, aria-labels on icon buttons
- [ ] Error pages (`error.vue`), 404
- [ ] README with setup, seed, deploy notes
