import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))

  // Everyone's quick-access and personal archive rows for this link go with it (prefs cascade).
  const deleted = await db
    .delete(schema.links)
    .where(eq(schema.links.id, id))
    .returning({ id: schema.links.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  return { deleted: true }
})
