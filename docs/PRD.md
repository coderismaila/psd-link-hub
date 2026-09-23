# PRD — PSD Link Hub (MVP)

## 1. Problem
Dispatch operations run on many Google Sheets. New sheets are created every month (monthly
reports, daily logs grouped per month) and some sheets are created once per year. Links get
lost in chats and bookmarks, old months clutter the view, and each person has a different
handful of sheets they open every day.

## 2. Goal
One responsive web app where the team can find the right sheet in seconds, with old monthly
sheets archived automatically and each person's most-used sheets one tap away.

## 3. Roles

| Capability                                   | Admin | Viewer |
|----------------------------------------------|:-----:|:------:|
| Log in / log out                             | ✅ | ✅ |
| View & search active links, open in new tab  | ✅ | ✅ |
| Pin / unpin a link (personal quick access)   | ✅ | ✅ |
| Reorder their quick-access links             | ✅ | ✅ |
| Personally archive / restore a link          | ✅ | ✅ |
| View archive (global + personal)             | ✅ | ✅ |
| Create / edit / delete links                 | ✅ | ❌ |
| Globally archive / restore a link            | ✅ | ❌ |
| Create / edit / delete categories            | ✅ | ❌ |
| Create / edit / deactivate users, set role, reset password | ✅ | ❌ |
| Change archive settings, run archive now     | ✅ | ❌ |

There is **no self sign-up**. The first admin is created by a seed task.

## 4. Core concepts

**Link** — `name`, `description`, `url`, `category`, `periodType` (`monthly` | `yearly`),
period (`year` + `month` for monthly, `year` for yearly), `createdAt` (automatic), `createdBy`.

**Category** — admin-managed list (name, colour picked from a swatch palette). Chosen as a card on
the link form and shown as a colour chip in the filters. A category in use cannot be deleted until its links are reassigned.

**Global archive** — the link is archived for everyone (`links.status = 'archived'`). Done by
an admin, or by the system's auto-archive for monthly links.

**Personal archive** — a user hides a link from *their own* active view only. Other users
are unaffected. Restorable at any time by that user.

**Quick access** — per-user. A link is pinned with the pin button on its card and appears as a
compact tile in the bar above the list. Tiles keep a user-defined order (drag to reorder). A
globally archived link drops out of quick access automatically (the preference is kept, so
restoring the link restores the tile).

## 5. Archive settings (admin, global)
- **Mode:** `auto` (default) or `manual`.
- **Grace days:** number of days after month end before a monthly link is archived (default **3**, range 0–31).
- **Include yearly links:** off by default; when on, yearly links are archived `graceDays` after 31 Dec.
- **Run now** button + "last run" timestamp.

Rule: a monthly link for period *YYYY-MM* is auto-archived once the current date in the app
timezone is **on or after (first day of the following month + graceDays)**.
Example: September 2026 link, grace 3 → archived from 4 Oct 2026.
Manual mode: nothing is archived automatically; the admin sees an "Overdue for archive" badge and
a bulk "Archive overdue" action instead.

## 6. User stories & acceptance criteria

**US-1 Login.** As any user I log in with email + password.
- Wrong credentials → generic error; deactivated users cannot log in.
- All pages except `/login` require a session; admin pages require role `admin` (server-enforced).

**US-2 Browse links.** As a user I see active links as cards (mobile) / table or grid (desktop).
- Filters: search (name/description), category, period type, period (month/year). Filters persist in the URL query.
- Each item shows name, category badge, period label (e.g. "Sep 2026" / "2026"), created date, description (truncated), star, "Open" button (new tab, `rel="noopener"`), copy-link, and a menu (archive for me; admin: edit, archive globally, delete).
- Default sort: newest period first, then name.

**US-3 Quick access.** As a user I pin a link and it appears in the Quick access bar at the top of the page.
- Pinned links are compact tiles, not a second copy of the card: name, category colour and period.
  Tapping a tile opens the sheet in a new tab.
- The pin on a card is the only way to pin or unpin. A pinned link shows a filled pin in the list;
  it is never rendered twice on the page.
- Dragging a tile within the bar reorders quick access; order survives reload. Works with touch
  (long-press ~150 ms). "Move earlier / Move later" in the tile menu does the same thing without a
  pointer, for keyboard and screen-reader users.
- Optimistic update; on API failure refetch and show a toast.

**US-4 Personal archive.** As a user I archive a link for myself; it disappears from my active list and quick access, and appears in Archive → "Archived by me" with a Restore action.

**US-5 Archive page.** Tabs: "Archived by me" and "Archived for everyone". Same filters. Admin sees Restore on global items.

**US-6 Manage links (admin).** Create/edit via modal form: name (required, ≤120), description (≤500), URL (required, https), category (required dropdown, with inline "create category" for admins), period type, month (monthly only) & year, each picked from visible options rather than a dropdown. `createdAt` is automatic and shown read-only.
- If the URL is not a `docs.google.com/spreadsheets` URL, show a non-blocking warning.
- "Duplicate for next period" action pre-fills the form with the next month/year.

**US-7 Manage categories (admin).** List, create, rename, change colour, delete (blocked with a clear message if in use, showing link count).

**US-8 Manage users (admin).** List users; create (name, email, role, temporary password); edit name/role; deactivate/reactivate; reset password. An admin cannot demote or deactivate themselves, and the last active admin cannot be demoted/deactivated.

**US-9 Settings (admin).** Edit archive mode, grace days, include-yearly; see last run; "Run archive now" shows how many links were archived.

**US-10 Responsive.** Usable at 375px width: sidebar becomes a drawer, tables become cards, forms are full-width modals/slideovers, tap targets ≥ 40px. Light and dark mode.

## 7. Out of scope (MVP)
Google OAuth / Drive API integration, auto-creating sheets, email notifications, audit log UI,
multi-tenant/teams, per-user archive settings, link click analytics.

## 8. Open questions (defaults chosen — confirm or change)
1. Should viewers be able to see globally archived links? **Default: yes (read-only).**
2. Should yearly links auto-archive? **Default: setting, off.**
3. Is a "daily" period type needed, or are daily sheets always grouped under a monthly sheet? **Default: monthly + yearly only.**
