import { db, schema } from '@nuxthub/db'
import { and, eq, sql } from 'drizzle-orm'
import { favoriteBodySchema, linkIdSchema } from '#shared/schemas/favorite'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const linkId = linkIdSchema.parse(getRouterParam(event, 'id'))
  const { favorite } = await readValidatedBody(event, favoriteBodySchema.parse)

  const [link] = await db
    .select({ id: schema.links.id })
    .from(schema.links)
    .where(and(eq(schema.links.id, linkId), eq(schema.links.status, 'active')))
    .limit(1)

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  let favoriteOrder: number | null = null

  if (favorite) {
    // New favorites go to the end of the user's list.
    const [highest] = await db
      .select({ max: sql<number | null>`max(${schema.userLinkPrefs.favoriteOrder})` })
      .from(schema.userLinkPrefs)
      .where(and(
        eq(schema.userLinkPrefs.userId, user.id),
        eq(schema.userLinkPrefs.isFavorite, true)
      ))

    favoriteOrder = (highest?.max ?? 0) + 1
  }

  await db
    .insert(schema.userLinkPrefs)
    .values({ userId: user.id, linkId, isFavorite: favorite, favoriteOrder })
    .onConflictDoUpdate({
      target: [schema.userLinkPrefs.userId, schema.userLinkPrefs.linkId],
      set: { isFavorite: favorite, favoriteOrder, updatedAt: new Date() }
    })

  return { favorite, favoriteOrder }
})
