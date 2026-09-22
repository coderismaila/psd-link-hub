import { db, schema } from '@nuxthub/db'
import { and, eq, sql } from 'drizzle-orm'
import { quickAccessBodySchema, linkIdSchema } from '#shared/schemas/quick-access'

export default defineEventHandler(async (event) => {
  const user = await requireAuthUser(event)
  const linkId = linkIdSchema.parse(getRouterParam(event, 'id'))
  const { pinned } = await readValidatedBody(event, quickAccessBodySchema.parse)

  const [link] = await db
    .select({ id: schema.links.id })
    .from(schema.links)
    .where(and(eq(schema.links.id, linkId), eq(schema.links.status, 'active')))
    .limit(1)

  if (!link) {
    throw createError({ statusCode: 404, statusMessage: 'Link not found' })
  }

  let quickAccessOrder: number | null = null

  if (pinned) {
    // New entries go to the end of the user's list.
    const [highest] = await db
      .select({ max: sql<number | null>`max(${schema.userLinkPrefs.quickAccessOrder})` })
      .from(schema.userLinkPrefs)
      .where(and(
        eq(schema.userLinkPrefs.userId, user.id),
        eq(schema.userLinkPrefs.isQuickAccess, true)
      ))

    quickAccessOrder = (highest?.max ?? 0) + 1
  }

  await db
    .insert(schema.userLinkPrefs)
    .values({ userId: user.id, linkId, isQuickAccess: pinned, quickAccessOrder })
    .onConflictDoUpdate({
      target: [schema.userLinkPrefs.userId, schema.userLinkPrefs.linkId],
      set: { isQuickAccess: pinned, quickAccessOrder, updatedAt: new Date() }
    })

  return { pinned, quickAccessOrder }
})
