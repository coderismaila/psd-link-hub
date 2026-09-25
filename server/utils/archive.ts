import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'
import { isArchiveDue } from '#shared/utils/period'

/** How stale `lastRunAt` may get before a browse request triggers a catch-up run. */
const LAZY_RUN_INTERVAL_MS = 60 * 60 * 1000

/** The active links auto-archive is allowed to consider, given the include-yearly setting. */
async function archiveCandidates(includeYearly: boolean, tx: DbExecutor) {
  const where = includeYearly
    ? eq(schema.links.status, 'active')
    : and(eq(schema.links.status, 'active'), eq(schema.links.periodType, 'monthly'))

  return await tx
    .select({
      id: schema.links.id,
      periodType: schema.links.periodType,
      periodYear: schema.links.periodYear,
      periodMonth: schema.links.periodMonth
    })
    .from(schema.links)
    .where(where)
}

/**
 * Archives every active link that has passed its due date.
 *
 * Does nothing in manual mode unless forced, which is what the admin's "Run archive now" and
 * "Archive overdue" buttons do. Running it twice in a row archives nothing the second time, since
 * only active links are considered.
 */
export async function runAutoArchive(
  options: { force?: boolean, actor?: { id: number | null, label: string } } = {}
): Promise<number> {
  const settings = await getSettings()

  if (settings.mode === 'manual' && !options.force) {
    return 0
  }

  const timeZone = useRuntimeConfig().public.appTimezone
  const now = new Date()

  /*
   * One transaction for the whole run: the archiving, the last-run stamp and the audit entry
   * commit together or not at all. If the entry cannot be written the run rolls back and throws;
   * the lazy caller in `GET /api/links` catches that, so browsing carries on and the run is simply
   * retried on a later request — never an archive that went unrecorded.
   */
  return await db.transaction(async (tx) => {
    const due = (await archiveCandidates(settings.includeYearly, tx))
      .filter(link => isArchiveDue(link, settings.graceDays, now, timeZone))

    // Restricted to rows still active, and counted from what the update actually changed, so two
    // overlapping runs cannot both claim — and both record — the same links.
    const archived = due.length
      ? await tx
          .update(schema.links)
          .set({ status: 'archived', archivedAt: now, archivedBy: 'system', archivedByUserId: null })
          .where(and(
            inArray(schema.links.id, due.map(link => link.id)),
            eq(schema.links.status, 'active')
          ))
          .returning({ name: schema.links.name })
      : []

    await updateSettings({ lastRunAt: now.toISOString() }, tx)

    // Only worth an entry when something actually moved; a nightly no-op is noise.
    if (archived.length) {
      const names = archived.map(link => link.name)
      const listed = names.length > 5
        ? `${names.slice(0, 5).join(', ')} and ${names.length - 5} more`
        : names.join(', ')

      await recordAudit(tx, options.actor ?? SYSTEM_ACTOR, {
        action: 'archive.run',
        entityType: 'archive',
        summary: `Archived ${archived.length} link${archived.length === 1 ? '' : 's'} past their period: ${listed}`
      })
    }

    return archived.length
  })
}

/**
 * The lazy fallback for deployments without cron: called when someone browses, it runs at most
 * once an hour and only while auto mode is on.
 */
export async function maybeRunAutoArchive(): Promise<number> {
  const settings = await getSettings()

  if (settings.mode !== 'auto') {
    return 0
  }

  const lastRun = settings.lastRunAt ? Date.parse(settings.lastRunAt) : Number.NaN

  if (!Number.isNaN(lastRun) && Date.now() - lastRun < LAZY_RUN_INTERVAL_MS) {
    return 0
  }

  return await runAutoArchive()
}

/**
 * Active links that have already passed their due date. In manual mode this is what the admin
 * sees as "overdue"; in auto mode it should normally be empty.
 */
export async function findOverdueLinks(userId: number) {
  const settings = await getSettings()
  const timeZone = useRuntimeConfig().public.appTimezone
  const now = new Date()

  const candidates = await db
    .select(linkWithPrefsColumns)
    .from(schema.links)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.links.categoryId))
    // Scoped to the caller: an unscoped join would repeat each link once per user who has a
    // preference row for it.
    .leftJoin(
      schema.userLinkPrefs,
      and(
        eq(schema.userLinkPrefs.linkId, schema.links.id),
        eq(schema.userLinkPrefs.userId, userId)
      )
    )
    .where(settings.includeYearly
      ? eq(schema.links.status, 'active')
      : and(eq(schema.links.status, 'active'), eq(schema.links.periodType, 'monthly')))

  return candidates
    .filter(link => isArchiveDue(link, settings.graceDays, now, timeZone))
    .map(toLinkWithPrefs)
}
