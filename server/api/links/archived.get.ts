import { db, schema } from '@nuxthub/db'
import { and, asc, desc, eq, type SQL } from 'drizzle-orm'
import { archivedQuerySchema } from '#shared/schemas/archive'
import type { LinkWithPrefs } from '#shared/types/link'

export default defineEventHandler(async (event): Promise<LinkWithPrefs[]> => {
  const user = await requireAuthUser(event)
  const { scope, ...filters } = await getValidatedQuery(event, archivedQuerySchema.parse)

  const conditions: SQL[] = [
    scope === 'mine'
      // The caller's own hidden links, whatever their global status.
      ? eq(schema.userLinkPrefs.isArchived, true)
      // Archived for everyone. Viewers may read these; only admins can restore them.
      : eq(schema.links.status, 'archived')
  ]

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
    .leftJoin(
      schema.userLinkPrefs,
      and(
        eq(schema.userLinkPrefs.linkId, schema.links.id),
        eq(schema.userLinkPrefs.userId, user.id)
      )
    )
    .where(and(...conditions))
    .orderBy(desc(schema.links.periodYear), desc(schema.links.periodMonth), asc(schema.links.name))

  return rows.map(toLinkWithPrefs)
})
