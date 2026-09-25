import { db, schema } from '@nuxthub/db'
import { and, eq, ne } from 'drizzle-orm'
import { categoryBodySchema } from '#shared/schemas/category'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))
  const body = await readValidatedBody(event, categoryBodySchema.parse)

  const [clash] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(and(eq(schema.categories.name, body.name), ne(schema.categories.id, id)))
    .limit(1)

  if (clash) {
    throw createError({ statusCode: 409, statusMessage: 'A category with that name already exists' })
  }

  await db.transaction(async (tx) => {
    const updated = await tx
      .update(schema.categories)
      .set(body)
      .where(eq(schema.categories.id, id))
      .returning({ id: schema.categories.id })

    if (!updated.length) {
      throw createError({ statusCode: 404, statusMessage: 'Category not found' })
    }

    await recordAudit(tx, auditActor(actor), {
      action: 'category.updated',
      entityType: 'category',
      entityId: id,
      entityLabel: body.name,
      summary: `Updated category ${body.name}`
    })
  })

  return { id }
})
