import { db, schema } from '@nuxthub/db'
import { and, eq, ne } from 'drizzle-orm'
import { categoryBodySchema } from '#shared/schemas/category'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

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

  const updated = await db
    .update(schema.categories)
    .set(body)
    .where(eq(schema.categories.id, id))
    .returning({ id: schema.categories.id })

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  return { id }
})
