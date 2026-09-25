import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { linkBodySchema } from '#shared/schemas/link'

export default defineEventHandler(async (event) => {
  const user = await requireAdmin(event)
  const body = await readValidatedBody(event, linkBodySchema.parse)

  await assertCategoryExists(body.categoryId)

  const id = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(schema.links)
      .values({ ...body, createdBy: user.id })
      .returning({ id: schema.links.id })

    await recordAudit(tx, auditActor(user), {
      action: 'link.created',
      entityType: 'link',
      entityId: created!.id,
      entityLabel: body.name,
      summary: `Created link ${body.name}`
    })

    return created!.id
  })

  setResponseStatus(event, 201)

  return { id }
})

async function assertCategoryExists(categoryId: number) {
  const [category] = await db
    .select({ id: schema.categories.id })
    .from(schema.categories)
    .where(eq(schema.categories.id, categoryId))
    .limit(1)

  if (!category) {
    throw createError({ statusCode: 400, statusMessage: 'That category no longer exists' })
  }
}
