# PSD Link Hub

One place for the Google Sheets that dispatch operations run on. New sheets appear every month,
some live for a year, and everyone has their own handful they open daily. This app keeps the
current ones findable, archives old months on its own, and lets each person keep their own
favorites.

- **Roles:** admins manage links, categories, users and archive settings; viewers browse, favorite
  and keep a personal archive.
- **No self sign-up.** The first admin comes from a seed task; every other account is created by
  an admin.

See [`docs/PRD.md`](docs/PRD.md) for what it does, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)
for how, and [`docs/IMPLEMENTATION_PLAN.md`](docs/IMPLEMENTATION_PLAN.md) for what is built.

## Stack

Nuxt 4 · Nuxt UI v4 + Tailwind v4 · SQLite through NuxtHub with Drizzle · `nuxt-auth-utils`
sessions · Zod · `vue-draggable-plus` · pnpm.

## Setup

```bash
pnpm install
cp .env.example .env
```

Then edit `.env`:

| Variable | Purpose |
|---|---|
| `NUXT_SESSION_PASSWORD` | Secret sealing the session cookie. **Must be 32+ characters.** |
| `NUXT_ADMIN_EMAIL` / `NUXT_ADMIN_PASSWORD` | The first admin, created by the seed task. |
| `NUXT_ADMIN_NAME` | Display name for that admin. Defaults to `Administrator`. |
| `NUXT_PUBLIC_APP_TIMEZONE` | Timezone all archive date maths runs in. Defaults to `UTC`. |

Generate a session secret with:

```bash
node -e "console.log(require('crypto').randomBytes(24).toString('base64url'))"
```

The timezone matters: a link falls due for archive at local midnight in this zone, not at a UTC
instant. Set it to wherever the team actually works.

## Running it

```bash
pnpm dev        # http://localhost:3000, applies pending migrations on boot
pnpm build && pnpm preview
```

The local database is a SQLite file at `.data/db/sqlite.db`. It is gitignored — deleting it throws
away all data and you start again from the seed.

## Seeding the first admin

Run the `db:seed` Nitro task once the dev server is up, either from Nuxt DevTools → Tasks or:

```bash
curl -X POST http://localhost:3000/_nitro/tasks/db:seed
```

It creates the admin from `.env`, three sample categories and four sample links. It is safe to run
twice: it skips the admin if one already exists and skips the samples if any link exists.

**Change `NUXT_ADMIN_PASSWORD` from the example value before seeding anything you care about.**
The task only creates the admin when none exists, so editing `.env` afterwards will not update the
password — reset it from `/admin/users` instead.

## Checks

```bash
pnpm lint        # eslint
pnpm typecheck   # vue-tsc
pnpm test        # node:test, unit tests for the period/archive date maths
```

Tests use Node's built-in runner with type stripping, so there is no test framework dependency.
They cover `shared/utils/period.ts`: month ends, December rolling into January, zero grace days,
month lengths and leap years, and timezones either side of UTC.

## Changing the database

```bash
# edit server/db/schema.ts, then
npx nuxt db generate   # writes a migration to server/db/migrations/sqlite/
npx nuxt db migrate    # or just restart pnpm dev
```

Never hand-edit a generated migration — change the schema and regenerate.

## How archiving works

A monthly link for *YYYY-MM* becomes due once the date in `NUXT_PUBLIC_APP_TIMEZONE` reaches the
first day of the next month plus the configured grace days. September 2026 with 3 grace days is
archived from 4 October 2026. Yearly links are excluded unless the setting is switched on, in which
case they fall due after 31 December.

Admins control mode (automatic or manual), grace days and the yearly toggle at `/admin/settings`,
where they can also run the archive immediately and see what is overdue.

Archiving runs in two ways, and you want at least one of them:

1. **Scheduled task** — `archive:monthly` runs daily at 00:15 server time. This needs a
   long-running Node server or a host with cron support.
2. **Lazy catch-up** — browsing triggers a run if the last one was over an hour ago. This keeps
   automatic archiving working on hosts without cron, as long as somebody visits.

On a platform where neither applies (a fully static deploy, say), switch to manual mode so the
overdue list makes the state obvious.

## Deploying

The app needs a Node server and a persistent SQLite file, so it wants a host with a writable disk —
a VPS, Fly.io, Railway or similar — rather than a purely serverless target where `.data/` vanishes
between invocations.

- Set every variable from the table above in the host's environment. `NUXT_SESSION_PASSWORD` must
  be a fresh secret, not the one from your machine; changing it signs everybody out.
- Serve over HTTPS. The session cookie is the only thing standing between a user and their account.
- Migrations are applied at build and on boot, so a deploy picks up schema changes on its own.
- Seed the first admin once, then create the rest from `/admin/users`.
- Back up `.data/db/sqlite.db`. It holds every link, user and preference.

## Directory layout

```
app/          pages, layouts, components, composables (Nuxt 4 app dir)
server/       api handlers, db schema and migrations, nitro tasks, guards
shared/       zod schemas, shared types, pure period helpers — used by both sides
test/         unit tests
docs/         PRD, architecture, implementation plan
```
