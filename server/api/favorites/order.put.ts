import { db, schema } from '@nuxthub/db'
import { and, eq, inArray } from 'drizzle-orm'
import { favoriteOrderBodySchema } from '#shared/schemas/favorite'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const { linkIds } = await readValidatedBody(event, favoriteOrderBodySchema.parse)

  if (!linkIds.length) {
    return { updated: 0 }
  }

  // Only rows this user has actually favorited are touched, so a crafted list of ids cannot
  // reach anyone else's preferences.
  const owned = await db
    .select({ linkId: schema.userLinkPrefs.linkId })
    .from(schema.userLinkPrefs)
    .where(and(
      eq(schema.userLinkPrefs.userId, user.id),
      eq(schema.userLinkPrefs.isFavorite, true),
      inArray(schema.userLinkPrefs.linkId, linkIds)
    ))

  const ownedIds = new Set(owned.map(row => row.linkId))
  const updatedAt = new Date()

  // Spread the orders out by 10 so a later single insert can slot between two rows.
  const updates = linkIds
    .filter(linkId => ownedIds.has(linkId))
    .map((linkId, index) => db
      .update(schema.userLinkPrefs)
      .set({ favoriteOrder: index * 10, updatedAt })
      .where(and(
        eq(schema.userLinkPrefs.userId, user.id),
        eq(schema.userLinkPrefs.linkId, linkId)
      ))
    )

  if (!updates.length) {
    return { updated: 0 }
  }

  await db.batch(updates as [typeof updates[number], ...typeof updates])

  return { updated: updates.length }
})
