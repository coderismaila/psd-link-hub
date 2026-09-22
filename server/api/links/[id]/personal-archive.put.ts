import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { personalArchiveBodySchema } from '#shared/schemas/archive'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)

  const linkId = idParamSchema.parse(getRouterParam(event, 'id'))
  const { archived } = await readValidatedBody(event, personalArchiveBodySchema.parse)

  const [link] = await db
    .select({ id: schema.links.id })
    .from(schema.links)
    .where(eq(schema.links.id, linkId))
    .limit(1)

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  const now = new Date()

  // Hiding a link also drops it out of the user's favorites; restoring does not put it back,
  // which matches what "archive this for me" reads as.
  const values = archived
    ? { isArchived: true, archivedAt: now, isFavorite: false, favoriteOrder: null }
    : { isArchived: false, archivedAt: null }

  await db
    .insert(schema.userLinkPrefs)
    .values({ userId: user.id, linkId, ...values })
    .onConflictDoUpdate({
      target: [schema.userLinkPrefs.userId, schema.userLinkPrefs.linkId],
      set: { ...values, updatedAt: now }
    })

  return { archived }
})
