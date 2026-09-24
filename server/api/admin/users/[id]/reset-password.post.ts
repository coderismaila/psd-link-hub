import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { idParamSchema } from '#shared/schemas/link'
import { resetPasswordSchema } from '#shared/schemas/user'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  const id = idParamSchema.parse(getRouterParam(event, 'id'))
  const { password } = await readValidatedBody(event, resetPasswordSchema.parse)

  const updated = await db
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(password),
      // An admin resetting their own password already chose it, so there is nothing to force.
      mustChangePassword: id !== actor.id
    })
    .where(eq(schema.users.id, id))
    .returning({ id: schema.users.id, email: schema.users.email, name: schema.users.name })

  if (!updated.length) {
    throw createError({ statusCode: 404, statusMessage: 'User not found' })
  }

  await recordAudit(auditActor(actor), {
    action: 'user.password_reset',
    entityType: 'user',
    entityId: id,
    entityLabel: updated[0]!.name,
    summary: id === actor.id
      ? 'Changed their own password from the admin page'
      : `Reset the password for ${updated[0]!.email}`
  })

  return { id, reset: true }
})
