import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { changePasswordSchema } from '#shared/schemas/user'

/**
 * A user replacing their own password. Knowing the current one is what proves it is really them,
 * so a borrowed session cannot lock the owner out of their own account.
 */
export default defineEventHandler(async (event) => {
  // The one endpoint reachable while a password change is outstanding — it is the way out.
  const user = await requireAuthUser(event, { allowPendingPasswordChange: true })
  const { currentPassword, newPassword } = await readValidatedBody(event, changePasswordSchema.parse)

  if (!await verifyPassword(user.passwordHash, currentPassword)) {
    throw createError({ statusCode: 403, statusMessage: 'That is not your current password' })
  }

  await db
    .update(schema.users)
    .set({
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false
    })
    .where(eq(schema.users.id, user.id))

  // Refresh the session so the client stops redirecting to the change-password page.
  await setUserSession(event, {
    user: toSessionUser({ ...user, mustChangePassword: false })
  })

  await recordAudit(auditActor(user), {
    action: 'user.password_changed',
    entityType: 'user',
    entityId: user.id,
    entityLabel: user.name,
    summary: 'Set their own password'
  })

  return { changed: true }
})
