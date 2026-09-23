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

const WINDOW_MS = 15 * 60 * 1000

/**
 * Attempts are counted per account, not per address: this app sits behind one office connection,
 * so an address-only limit would lock out the whole team the moment one person fat-fingered their
 * password. The looser address limit is there to stop a script hammering many accounts at once —
 * a number no human at a keyboard will reach.
 */
const MAX_PER_EMAIL = 10
const MAX_PER_ADDRESS = 60

export default defineEventHandler(async (event) => {
  const { email, password } = await readValidatedBody(event, loginSchema.parse)

  const address = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  const emailKey = `login:email:${email}`
  const addressKey = `login:ip:${address}`

  // Checked before the password is verified, so a flood cannot be used to pin the CPU either.
  const verdict = [
    checkRateLimit(emailKey, MAX_PER_EMAIL),
    checkRateLimit(addressKey, MAX_PER_ADDRESS)
  ].find(result => result.limited)

  if (verdict) {
    setResponseHeader(event, 'retry-after', verdict.retryAfterSeconds)

    throw createError({
      statusCode: 429,
      statusMessage: 'Too many sign-in attempts. Please wait a few minutes and try again.'
    })
  }

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.email, email))
    .limit(1)

  const invalidCredentials = createError({
    statusCode: 401,
    statusMessage: 'Invalid email or password'
  })

  function countFailure() {
    recordFailure(emailKey, WINDOW_MS)
    recordFailure(addressKey, WINDOW_MS)
  }

  if (!user) {
    await burnVerificationTime(password)
    countFailure()
    throw invalidCredentials
  }

  if (!await verifyPassword(user.passwordHash, password)) {
    countFailure()
    throw invalidCredentials
  }

  // Checked only after the password is known to be correct, so this cannot be used to discover
  // which accounts exist.
  if (!user.isActive) {
    throw createError({ statusCode: 403, statusMessage: 'This account has been deactivated' })
  }

  clearFailures(emailKey)
  clearFailures(addressKey)

  const sessionUser = toSessionUser(user)
  await setUserSession(event, { user: sessionUser, loggedInAt: Date.now() })

  return { user: sessionUser }
})
