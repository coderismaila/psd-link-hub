import { db, schema } from '@nuxthub/db'
import { and, eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const id = idParamSchema.parse(getRouterParam(event, 'id'))

  await db.transaction(async (tx) => {
    // Quick-access entries were never removed, only hidden while the link was archived, so they
    // come back too.
    const restored = await tx
      .update(schema.links)
      .set({ status: 'active', archivedAt: null, archivedBy: null, archivedByUserId: null })
      .where(and(eq(schema.links.id, id), eq(schema.links.status, 'archived')))
      .returning({ id: schema.links.id, name: schema.links.name })

    if (!restored.length) {
      throw createError({ statusCode: 404, statusMessage: 'No archived link with that id' })
    }

    await recordAudit(tx, auditActor(actor), {
      action: 'link.restored',
      entityType: 'link',
      entityId: id,
      entityLabel: restored[0]!.name,
      summary: `Restored ${restored[0]!.name} for everyone`
    })
  })

  return { id, status: 'active' as const }
})
