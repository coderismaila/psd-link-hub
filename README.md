# PSD Link Hub

One place for the Google Sheets that dispatch operations run on. New sheets appear every month,
some live for a year, and everyone has their own handful they open daily. This app keeps the
current ones findable, archives old months on its own, and lets each person pin the few they use
daily to a quick-access bar.

- **Roles:** admins manage links, categories, users and archive settings; viewers browse, pin and
  keep a personal archive.
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

Two shapes work. On a host with a writable disk — a VPS, Fly.io, Railway — the local SQLite file
comes along as it is. On a serverless host such as Vercel it cannot, and the database moves to
Turso; see [Deploying to Vercel](#deploying-to-vercel) below.

- Set every variable from the table above in the host's environment. `NUXT_SESSION_PASSWORD` must
  be a fresh secret, not the one from your machine; changing it signs everybody out.
- Serve over HTTPS. The session cookie is the only thing standing between a user and their account.
- Sign-in is rate limited in memory: ten failed attempts per account and sixty per address in a
  fifteen-minute window. That state lives in the process, so behind more than one instance each
  would count separately and the limit would effectively multiply.
- Migrations are applied at build and on boot, so a deploy picks up schema changes on its own.
- Seed the first admin once, then create the rest from `/admin/users`.
- Back up `.data/db/sqlite.db`. It holds every link, user and preference.

### Deploying to Vercel

Vercel gives each request a fresh, read-only filesystem, so the local SQLite file cannot come
with you — anything written would vanish and no two invocations would agree. The database has to
move somewhere hosted. **Turso** is the natural choice: it *is* libSQL, so the dialect, the
schema, the migrations and the driver already in this project all stay exactly as they are. The
free plan is far beyond what this app needs.

**1. Create the database**

```bash
# https://docs.turso.tech/quickstart
turso db create psd-link-hub
turso db show psd-link-hub --url        # libsql://...
turso db tokens create psd-link-hub     # the auth token
```

**2. Apply the schema and create the first admin, from your machine**

Migrations are applied during the build, but do it yourself first so a failed deploy never leaves
you with an empty database and no clear reason why:

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... npx nuxt db migrate
```

Seeding uses a Nitro task, and the task runner is a development-only route. So point a local dev
server at the hosted database and seed through that, once:

```bash
TURSO_DATABASE_URL=libsql://... TURSO_AUTH_TOKEN=... pnpm dev
curl -X POST http://localhost:3000/_nitro/tasks/db:seed
```

Set `NUXT_ADMIN_EMAIL` and `NUXT_ADMIN_PASSWORD` to what you actually want before running this.

**3. Import the repository on Vercel and set the environment**

No adapter or preset is needed; Nitro detects Vercel on its own. In **Settings → Environment
Variables**, for every environment:

| Variable | Value |
|---|---|
| `TURSO_DATABASE_URL` | `libsql://…` from step 1 |
| `TURSO_AUTH_TOKEN` | the token from step 1 |
| `NUXT_SESSION_PASSWORD` | a fresh 32+ character secret, **not** the one on your machine |
| `NUXT_PUBLIC_APP_TIMEZONE` | the team's timezone, e.g. `Africa/Lagos` |
| `CRON_SECRET` | any long random string |

No code change switches the database over: NuxtHub sees `TURSO_DATABASE_URL` and
`TURSO_AUTH_TOKEN` and uses libSQL instead of the local file.

**4. Archiving on a schedule**

`vercel.json` already registers a daily cron against `/api/cron/archive`. It needs `CRON_SECRET`
set: Vercel only sends the bearer token when that variable exists, and the endpoint refuses to run
without it rather than sitting open. Nitro's own `archive:monthly` task stays in the project for
hosts that can run it, and simply never fires here.

Hobby accounts are capped at one cron run per day, and Vercel only promises the run happens
somewhere within the hour. Neither matters: a link falls due on a calendar date, so any run that
day archives it. The lazy catch-up on browsing covers the rest regardless.

### What to watch for on a serverless host

- **The libSQL native binding.** `@libsql/client` loads its native module when imported, even when
  the URL is remote, so this bites on Turso too. A deploy failing with
  `Cannot find module '@libsql/linux-x64-gnu'` is this; see
  [The native SQLite binding](#the-native-sqlite-binding).
- **Sign-in rate limiting counts per instance.** It keeps its state in memory, and serverless runs
  many instances, so the effective limit multiplies by however many are warm. It still blunts a
  sustained attack, but if you want a real ceiling it needs a shared store such as Vercel KV.
- **Back up the database.** `turso db shell psd-link-hub .dump > backup.sql`. It holds every link,
  user and preference.

### The native SQLite binding

`pnpm build` succeeds, but the bundle in `.output/` does **not** include libsql's
platform-specific native binding — Nitro's dependency tracing misses it, and the server exits at
startup with `Cannot find module '@libsql/<platform>'`. Verified on a local production build; the
same tracing applies wherever the bundle is shipped rather than installed.

Either install production dependencies on the host rather than shipping `.output/` alone, or copy
the matching package in after building:

```bash
cp -r node_modules/.pnpm/@libsql+<platform>@*/node_modules/@libsql/<platform> .output/server/node_modules/@libsql/
```

The platform is the host's, not your laptop's: `linux-x64-gnu` on most servers,
`win32-x64-msvc` on Windows, `darwin-arm64` on Apple silicon. Build on the platform you deploy to,
or let the host install its own.

### Caching

Responses are deliberately split in two:

- **`/api/**` is `no-store, private`.** Every API response is scoped to the signed-in user — the
  link list carries that user's own pins and hidden links. For the same reason none of these
  handlers use `defineCachedEventHandler`: a shared server-side cache would serve one person's
  view to another.
- **Static assets are `immutable` for a year.** Built files and the brand mark are
  content-addressed or versioned by filename, so they can be cached hard.

On the client, lists keep showing what they already have while they revalidate, so moving between
pages does not blank the screen back to skeletons.

## Directory layout

```
app/          pages, layouts, components, composables (Nuxt 4 app dir)
server/       api handlers, db schema and migrations, nitro tasks, guards
shared/       zod schemas, shared types, pure period helpers — used by both sides
test/         unit tests
docs/         PRD, architecture, implementation plan
```
