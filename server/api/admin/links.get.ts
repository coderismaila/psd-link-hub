import { db, schema } from '@nuxthub/db'
import { and, asc, desc, eq, type SQL } from 'drizzle-orm'
import { adminLinkFiltersSchema } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

/**
 * The management view of the catalogue. Unlike `GET /api/links` it returns archived links too,
 * and it never hides a link because the caller archived it for themselves — a personal
 * preference should not remove something from the table an admin manages it from.
 */
export default defineEventHandler(async (event): Promise<LinkWithPrefs[]> => {
  const user = await requireAdmin(event)
  const { status, ...filters } = await getValidatedQuery(event, adminLinkFiltersSchema.parse)

  const conditions: SQL[] = []

  if (status !== 'all') {
    conditions.push(eq(schema.links.status, status))
  }

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

  const rows = await db
    .select(linkWithPrefsColumns)
    .from(schema.links)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.links.categoryId))
    // Joined only so the caller's own pin state is accurate; never used to filter rows out.
    .leftJoin(
      schema.userLinkPrefs,
      and(
        eq(schema.userLinkPrefs.linkId, schema.links.id),
        eq(schema.userLinkPrefs.userId, user.id)
      )
    )
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(schema.links.periodYear), desc(schema.links.periodMonth), asc(schema.links.name))

  return rows.map(toLinkWithPrefs)
})
