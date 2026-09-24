import { db, schema } from '@nuxthub/db'
import type { AuditEntityType } from '#shared/types/audit'

export interface AuditInput {
  action: string
  entityType: AuditEntityType
  entityId?: number | null
  entityLabel?: string | null
  summary: string
  /** Field names an update touched. Stored as JSON alongside the entry. */
  changedFields?: string[]
}

/** The scheduler has no user behind it, so its entries are attributed to the system. */
export const SYSTEM_ACTOR = { id: null, label: 'System' } as const

/**
 * Appends one entry to the trail.
 *
 * A failure here is logged loudly but does not fail the operation that triggered it: refusing to
 * archive a link because a log row would not write trades a working app for a complete history,
 * which is the wrong way round for a tool like this. The trade-off is that the trail is
 * best-effort, not guaranteed — worth knowing before treating it as evidence.
 */
export async function recordAudit(
  actor: { id: number | null, label: string },
  input: AuditInput
): Promise<void> {
  try {
    await db.insert(schema.auditLogs).values({
      actorId: actor.id,
      actorLabel: actor.label,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      entityLabel: input.entityLabel ?? null,
      summary: input.summary,
      metadata: input.changedFields?.length
        ? JSON.stringify({ changedFields: input.changedFields })
        : null
    })
  } catch (error) {
    console.error('[audit] Failed to record entry:', input.action, error)
  }
}

/** Convenience for handlers that already hold the acting user. */
export function auditActor(user: { id: number, name: string }) {
  return { id: user.id, label: user.name }
}

/**
 * Compares two versions of a record and names the fields that differ. Constrained to `object`
 * rather than `Record<string, unknown>` so plain interfaces satisfy it.
 */
export function changedFields<T extends object>(before: T, after: Partial<T>): string[] {
  return (Object.keys(after) as (keyof T & string)[])
    .filter(key => before[key] !== after[key])
}
