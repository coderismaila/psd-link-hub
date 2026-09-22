import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'
import { resetPasswordSchema } from '#shared/schemas/user'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))
  const { password } = await readValidatedBody(event, resetPasswordSchema.parse)

  const updated = await db
    .update(schema.users)
    .set({ passwordHash: await hashPassword(password) })
    .where(eq(schema.users.id, id))
    .returning({ id: schema.users.id })

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  return { id, reset: true }
})
