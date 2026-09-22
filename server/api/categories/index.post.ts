import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { categoryBodySchema } from '#shared/schemas/category'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, categoryBodySchema.parse)

  const [existing] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.name, body.name))
    .limit(1)

  if (existing) {
    throw createError({ statusCode: 409, statusMessage: 'A category with that name already exists' })
  }

  const [created] = await db
    .insert(schema.categories)
    .values(body)
    .returning({ id: schema.categories.id })

  setResponseStatus(event, 201)

  return { id: created!.id }
})
