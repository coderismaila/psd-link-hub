import { db, schema } from '@nuxthub/db'
import { asc, count, eq } from 'drizzle-orm'
import type { CategoryWithCount } from '#shared/types/link'

export default defineEventHandler(async (event): Promise<CategoryWithCount[]> => {
  await requireAuthUser(event)

  return await db
    .select({
      id: schema.categories.id,
      name: schema.categories.name,
      color: schema.categories.color,
      linkCount: count(schema.links.id)
    })
    .from(schema.categories)
    .leftJoin(schema.links, eq(schema.links.categoryId, schema.categories.id))
    .groupBy(schema.categories.id)
    .orderBy(asc(schema.categories.name))
})
