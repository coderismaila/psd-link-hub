import type { H3Event } from 'h3'
import type { User } from '#auth-utils'
import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

export type DbUser = typeof schema.users.$inferSelect

/** Strips a database row down to the public fields that are safe to put in the session cookie. */
export function toSessionUser(user: DbUser): User {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    mustChangePassword: user.mustChangePassword
  }
}

/**
 * Requires a signed-in user and reloads the row from the database, so a user who was deactivated
 * or had their role changed after signing in is caught on their next request rather than keeping
 * whatever the cookie says. Refreshes the session when the stored copy has gone stale.
 */
export async function requireAuthUser(
  event: H3Event,
  options: { allowPendingPasswordChange?: boolean } = {}
): Promise<DbUser> {
  const session = await requireUserSession(event)

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.id, session.user.id))
    .limit(1)

  if (!user || !user.isActive) {
    await clearUserSession(event)
    throw createError({ statusCode: 401, statusMessage: 'Your session is no longer valid' })
  }

  const stale = session.user.role !== user.role
    || session.user.name !== user.name
    || session.user.email !== user.email
    || session.user.mustChangePassword !== user.mustChangePassword

  if (stale) {
    await setUserSession(event, { user: toSessionUser(user) })
  }

  /*
   * Enforced here rather than only in route middleware, which a direct API call would sail past.
   * The password endpoint itself opts out, otherwise there would be no way to satisfy the
   * requirement.
   */
  if (user.mustChangePassword && !options.allowPendingPasswordChange) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Set your own password before using the app'
    })
  }

  return user
}

/** Requires a signed-in admin. Never trust the role sent by the client. */
export async function requireAdmin(event: H3Event): Promise<DbUser> {
  const user = await requireAuthUser(event)

  if (user.role !== 'admin') {
    throw createError({ statusCode: 403, statusMessage: 'Admins only' })
  }

  return user
}
