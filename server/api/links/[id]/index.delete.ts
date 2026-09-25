import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))

  await db.transaction(async (tx) => {
    // Everyone's quick-access and personal archive rows for this link go with it (prefs cascade).
    const deleted = await tx
      .delete(schema.links)
      .where(eq(schema.links.id, id))
      .returning({ id: schema.links.id, name: schema.links.name })

    if (!deleted.length) {
      throw createError({ statusCode: 404, statusMessage: 'Link not found' })
    }

    // The name is captured here because after this the link no longer exists to look up.
    await recordAudit(tx, auditActor(actor), {
      action: 'link.deleted',
      entityType: 'link',
      entityId: id,
      entityLabel: deleted[0]!.name,
      summary: `Deleted link ${deleted[0]!.name}`
    })
  })

  return { deleted: true }
})
