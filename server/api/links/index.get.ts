import { db, schema } from '@nuxthub/db'
import { and, asc, desc, eq, isNull, or, type SQL } from 'drizzle-orm'
import { linkFiltersSchema } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

export default defineEventHandler(async (event): Promise<LinkWithPrefs[]> => {
  const user = await requireAuthUser(event)
  const filters = await getValidatedQuery(event, linkFiltersSchema.parse)

  // Phase 6 calls `maybeRunAutoArchive()` here so the app self-heals without cron.

  const conditions: SQL[] = [eq(schema.links.status, 'active')]

  if (filters.q) {
    conditions.push(searchCondition(filters.q))
  }

  if (filters.categoryId) {
    conditions.push(eq(schema.links.categoryId, filters.categoryId))
  }

  if (filters.periodType) {
    conditions.push(eq(schema.links.periodType, filters.periodType))
  }

  if (filters.year) {
    conditions.push(eq(schema.links.periodYear, filters.year))
  }

  if (filters.month) {
    conditions.push(eq(schema.links.periodMonth, filters.month))
  }

  // Hide links this user has archived for themselves. A missing preference row means they have
  // never touched the link, so it stays visible.
  const notPersonallyArchived = or(
    isNull(schema.userLinkPrefs.isArchived),
    eq(schema.userLinkPrefs.isArchived, false)
  )!

  const rows = await db
    .select(linkWithPrefsColumns)
    .from(schema.links)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.links.categoryId))
    .leftJoin(
      schema.userLinkPrefs,
      and(
        eq(schema.userLinkPrefs.linkId, schema.links.id),
        eq(schema.userLinkPrefs.userId, user.id)
      )
    )
    .where(and(...conditions, notPersonallyArchived))
    // Newest period first, then name. SQLite sorts NULL lowest, so a yearly link (no month)
    // lands after December of the same year.
    .orderBy(desc(schema.links.periodYear), desc(schema.links.periodMonth), asc(schema.links.name))

  return rows.map(toLinkWithPrefs)
})
