import { db, schema } from '@nuxthub/db'
import { eq } from 'drizzle-orm'
import { randomUUID } from 'node:crypto'
import { loginSchema } from '#shared/schemas/auth'

/**
 * Verifying a password is deliberately slow. When the email is unknown there is no hash to check,
 * so we burn the same time against a throwaway hash — otherwise the response time would reveal
 * which email addresses have accounts.
 */
let dummyHash: string | undefined

async function burnVerificationTime(password: string) {
  dummyHash ??= await hashPassword(randomUUID())
  await verifyPassword(dummyHash, password)
}

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, loginSchema.parse)

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  const invalidCredentials = createError({
    statusCode: 401,
    statusMessage: 'Invalid email or password'
  })

  if (!user) {
    await burnVerificationTime(password)
    throw invalidCredentials
  }

  if (!await verifyPassword(user.passwordHash, password)) {
    throw invalidCredentials
  }

  // Checked only after the password is known to be correct, so this cannot be used to discover
  // which accounts exist.
  if (!user.isActive) {
    throw createError({ statusCode: 403, statusMessage: 'This account has been deactivated' })
  }

  const sessionUser = toSessionUser(user)
  await setUserSession(event, { user: sessionUser, loggedInAt: Date.now() })

  return { user: sessionUser }
})
