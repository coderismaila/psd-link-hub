import { db, schema } from '@nuxthub/db'
import { and, asc, eq, isNull, or, sql } from 'drizzle-orm'
import type { LinkWithPrefs } from '#shared/types/link'

export default defineEventHandler(async (event): Promise<LinkWithPrefs[]> => {
  const user = await requireAuthUser(event)

  const rows = await db
    .select(linkWithPrefsColumns)
    .from(schema.links)
    .innerJoin(schema.categories, eq(schema.categories.id, schema.links.categoryId))
    .innerJoin(
      schema.userLinkPrefs,
      and(
        eq(schema.userLinkPrefs.linkId, schema.links.id),
        eq(schema.userLinkPrefs.userId, user.id)
      )
    )
    .where(and(
      // A globally archived link drops out of favorites; the preference itself is kept, so
      // restoring the link brings it back.
      eq(schema.links.status, 'active'),
      eq(schema.userLinkPrefs.isFavorite, true),
      or(
        isNull(schema.userLinkPrefs.isArchived),
        eq(schema.userLinkPrefs.isArchived, false)
      )
    ))
    // Gaps in the order are allowed, and a favorite that never got an order sorts last.
    .orderBy(
      sql`${schema.userLinkPrefs.favoriteOrder} is null`,
      asc(schema.userLinkPrefs.favoriteOrder),
      asc(schema.links.name)
    )

  return rows.map(toLinkWithPrefs)
})
