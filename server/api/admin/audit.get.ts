import { db, schema } from '@nuxthub/db'
import { and, count, desc, eq, type SQL } from 'drizzle-orm'
import { auditQuerySchema } from '#shared/schemas/audit'
import type { AuditEntryDTO, AuditPage } from '#shared/types/audit'

function parseChangedFields(metadata: string | null): string[] {
  if (!metadata) return []

  try {
    const parsed = JSON.parse(metadata) as { changedFields?: unknown }
    return Array.isArray(parsed.changedFields) ? parsed.changedFields.map(String) : []
  } catch {
    return []
  }
}

export default defineEventHandler(async (event): Promise<AuditPage> => {
  await requireAdmin(event)
  const { entityType, actorId, limit, offset } = await getValidatedQuery(event, auditQuerySchema.parse)

  const conditions: SQL[] = []
  if (entityType) conditions.push(eq(schema.auditLogs.entityType, entityType))
  if (actorId) conditions.push(eq(schema.auditLogs.actorId, actorId))

  const where = conditions.length ? and(...conditions) : undefined

  const rows = await db
    .select()
    .from(schema.auditLogs)
    .where(where)
    .orderBy(desc(schema.auditLogs.createdAt), desc(schema.auditLogs.id))
    .limit(limit)
    .offset(offset)

  const [totals] = await db
    .select({ total: count(schema.auditLogs.id) })
    .from(schema.auditLogs)
    .where(where)

  const entries: AuditEntryDTO[] = rows.map(row => ({
    id: row.id,
    actorId: row.actorId,
    actorLabel: row.actorLabel,
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    entityLabel: row.entityLabel,
    summary: row.summary,
    changedFields: parseChangedFields(row.metadata),
    createdAt: row.createdAt.toISOString()
  }))

  return { entries, total: totals?.total ?? 0 }
})
