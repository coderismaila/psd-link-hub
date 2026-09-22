import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'

/**
 * Re-checks the user against the database every time the session is read, so deactivating a user
 * (or changing their role) takes effect on their very next request instead of whenever their
 * cookie happens to expire.
 */
export default defineNitroPlugin(() => {
  sessionHooks.hook('fetch', async (session, event) => {
    const userId = session.user?.id
    if (!userId) return

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.id, userId))
      .limit(1)

    if (!user || !user.isActive) {
      await clearUserSession(event)
      throw createError({ statusCode: 401, statusMessage: 'Your session is no longer valid' })
    }

    session.user = toSessionUser(user)
  })
})
