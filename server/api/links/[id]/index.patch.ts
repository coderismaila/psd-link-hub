import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema, linkBodySchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

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

  const updated = await db
    .update(schema.links)
    .set(body)
    .where(eq(schema.links.id, id))
    .returning({ id: schema.links.id })

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  return { id }
})
