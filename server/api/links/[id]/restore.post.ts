import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const id = idParamSchema.parse(getRouterParam(event, 'id'))

  // Quick-access entries were never removed, only hidden while the link was archived, so they come back too.
  const restored = await db
    .update(schema.links)
    .set({ status: 'active', archivedAt: null, archivedBy: null, archivedByUserId: null })
    .where(and(eq(schema.links.id, id), eq(schema.links.status, 'archived')))
    .returning({ id: schema.links.id })

  if (!restored.length) {
    throw createError({ statusCode: 404, statusMessage: 'No archived link with that id' })
  }

  return { id, status: 'active' as const }
})
