import { db, schema } from '@nuxthub/db'
import { count, eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))

  // The foreign key is `on delete restrict`, so check first to give a message worth reading.
  const [usage] = await db
    .select({ links: count(schema.links.id) })
    .from(schema.links)
    .where(eq(schema.links.categoryId, id))

  const linkCount = usage?.links ?? 0

  if (linkCount > 0) {
    throw createError({
      statusCode: 409,
      statusMessage: `This category is used by ${linkCount} link${linkCount === 1 ? '' : 's'}. Reassign them first.`
    })
  }

  const deleted = await db
    .delete(schema.categories)
    .where(eq(schema.categories.id, id))
    .returning({ id: schema.categories.id })

  if (!deleted.length) {
    throw createError({ statusCode: 404, statusMessage: 'Category not found' })
  }

  return { deleted: true }
})
