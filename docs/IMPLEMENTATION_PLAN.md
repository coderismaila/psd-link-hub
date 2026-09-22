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
- [x] `#auth-utils` User type augmentation
- [x] `POST /api/auth/login`; `server/utils/auth.ts` (`requireAuthUser`, `requireAdmin`)
- [x] `auth.global.ts` + `admin.ts` middleware
- [x] `/login` page (auth layout), logout from user menu
- [x] Deactivated user is logged out on next request

## Phase 3 — Layout & read-only browsing
- [x] `layouts/default.vue` with UDashboard components, role-aware nav, colour-mode toggle
- [x] `shared/utils/period.ts` + zod schemas in `shared/schemas`
- [x] `GET /api/categories`, `GET /api/links` (filters, prefs merge)
- [x] `LinkFilters`, `LinkCard`, `LinkList`; filters synced to URL
- [x] Open (new tab) + copy link; empty & loading states (USkeleton)

## Phase 4 — Quick access
- [x] Pin / order endpoints; `GET /api/links/quick-access`
- [x] `useQuickAccess()` with optimistic updates + rollback toasts
- [x] Pin toggle on cards
- [ ] `QuickAccessBar` with drag-to-reorder (vue-draggable-plus), touch tested
  — redesigned after Phase 8: quick access is compact tiles, drag reorders them and nothing else.
    Drag-to-pin and the mobile Favorites/All tabs were removed. Still needs a manual
    drag + touch check in a browser.
- [x] ~~Mobile: UTabs Favorites / All~~ — dropped; the bar and the list share one page at every width

## Phase 5 — Admin: links & categories
- [x] Link CRUD endpoints + `LinkFormModal` (category dropdown, period fields, Sheets URL warning)
- [x] "Duplicate for next period"
- [x] Category CRUD endpoints + `/admin/categories` (delete blocked when in use)
- [x] `/admin/links` table (cards on mobile)

## Phase 6 — Archive
- [x] Personal archive endpoint + "Archive for me" action
- [x] Global archive / restore endpoints (admin)
- [x] `runAutoArchive`, `maybeRunAutoArchive`, `archive:monthly` scheduled task
- [x] `/archive` page with both tabs and restore actions
- [x] `/admin/settings` (mode, grace days, include yearly, run now, last run, overdue list in manual mode)
- [x] Unit tests for `period.ts` (month end, December → January, grace 0, timezone edge)

## Phase 7 — Admin: users
- [x] Users endpoints (no `passwordHash` in responses) + self/last-admin protections
- [x] `/admin/users` table + create/edit slideover + reset password

## Phase 8 — Polish
- [ ] Responsive pass at 375 / 768 / 1280; dark mode pass
  — code audited (no hard-coded light-only colours; tables collapse to cards; tap targets
    raised to 40px). The visual pass at each width, in both themes, still needs a browser.
- [x] Keyboard access for quick access (menu move earlier/later), focus states, aria-labels on icon buttons
  — focus rings are Nuxt UI defaults and were not checked visually.
- [x] Error pages (`error.vue`), 404
- [x] README with setup, seed, deploy notes
