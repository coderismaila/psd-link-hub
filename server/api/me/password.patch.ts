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

  // Hashed before the transaction opens, so the write lock is not held while scrypt runs.
  const passwordHash = await hashPassword(newPassword)

  await db.transaction(async (tx) => {
    await tx
      .update(schema.users)
      .set({ passwordHash, mustChangePassword: false })
      .where(eq(schema.users.id, user.id))

    await recordAudit(tx, auditActor(user), {
      action: 'user.password_changed',
      entityType: 'user',
      entityId: user.id,
      entityLabel: user.name,
      summary: 'Set their own password'
    })
  })

  // Only once the change has committed: refreshing earlier would tell the client the requirement
  // was met even if the transaction then rolled back.
  await setUserSession(event, {
    user: toSessionUser({ ...user, mustChangePassword: false })
  })

  return { changed: true }
})
