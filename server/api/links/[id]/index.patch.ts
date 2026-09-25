import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema, linkBodySchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, linkBodySchema.parse)

  const [category] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.id, body.categoryId))
    .limit(1)

  if (!category) {
    throw createError({ statusCode: 400, statusMessage: 'That category no longer exists' })
  }

  await db.transaction(async (tx) => {
    // Read inside the transaction, so the recorded diff is against the row as it was at the
    // moment it changed, not as it was a request ago.
    const [before] = await tx
      .select()
      .from(schema.links)
      .where(eq(schema.links.id, id))
      .limit(1)

    if (!before) {
      throw createError({ statusCode: 404, statusMessage: 'Link not found' })
    }

    await tx.update(schema.links).set(body).where(eq(schema.links.id, id))

    await recordAudit(tx, auditActor(actor), {
      action: 'link.updated',
      entityType: 'link',
      entityId: id,
      entityLabel: body.name,
      summary: `Updated link ${body.name}`,
      changedFields: changedFields(before, body)
    })
  })

  return { id }
})
