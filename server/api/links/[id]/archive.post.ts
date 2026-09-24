import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const id = idParamSchema.parse(getRouterParam(event, 'id'))

  const archived = await db
    .update(schema.links)
    .set({
      status: 'archived',
      archivedAt: new Date(),
      archivedBy: 'admin',
      archivedByUserId: user.id
    })
    .where(and(eq(schema.links.id, id), eq(schema.links.status, 'active')))
    .returning({ id: schema.links.id, name: schema.links.name })

  if (!archived.length) {
    throw createError({ statusCode: 404, statusMessage: 'No active link with that id' })
  }

  await recordAudit(auditActor(user), {
    action: 'link.archived',
    entityType: 'link',
    entityId: id,
    entityLabel: archived[0]!.name,
    summary: `Archived ${archived[0]!.name} for everyone`
  })

  return { id, status: 'archived' as const }
})
