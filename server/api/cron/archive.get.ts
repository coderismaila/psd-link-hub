import { timingSafeEqual } from 'node:crypto'

/** Compares without leaking, through the timing, how much of the secret was correct. */
function secretMatches(given: string, expected: string): boolean {
  const a = Buffer.from(given)
  const b = Buffer.from(expected)

  // timingSafeEqual throws on a length mismatch, and the length is not the secret.
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * The archive run, for a platform scheduler rather than a person.
 *
 * Nitro's own scheduled task needs a long-running server; on a serverless host the schedule comes
 * from the platform instead, and Vercel issues cron requests as GET with a bearer token. That is
 * why this mutates on GET — the method is the platform's choice, not a REST decision.
 *
 * Not forced: if an admin has set the archive to manual, a scheduler must not override that.
 */
export default defineEventHandler(async (event) => {
  // `CRON_SECRET` is the name Vercel itself looks for before it will send the header at all.
  const expected = process.env.CRON_SECRET || useRuntimeConfig(event).cronSecret

  if (!expected) {
    // Fail closed. An unprotected endpoint that rewrites link status is not an acceptable default.
    throw createError({
      statusCode: 503,
      statusMessage: 'Scheduled archiving is not configured'
    })
  }

  const provided = getRequestHeader(event, 'authorization') ?? ''

  if (!secretMatches(provided, `Bearer ${expected}`)) {
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  }

  const archived = await runAutoArchive()
  console.log(`[cron] Archived ${archived} link(s).`)

  return { archived }
})
