import { schema } from '@nuxthub/db'
import type { db } from '@nuxthub/db'
import type { AuditEntityType } from '#shared/types/audit'

/** The transaction handle Drizzle passes to `db.transaction(async tx => …)`. */
export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0]

/** Anything that can run a statement: the database itself, or a transaction in progress. */
export type DbExecutor = typeof db | DbTransaction

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
 * Appends one entry to the trail, inside the caller's transaction.
 *
 * Callers run this in the same `db.transaction` as the change it describes, so the two commit or
 * roll back together: there is no change without its entry, and no entry for a change that did
 * not happen. It deliberately does not catch — if the entry cannot be written, the error
 * propagates, the transaction rolls back, and the action fails. An admin action that cannot be
 * accounted for does not go ahead.
 *
 * The executor is required rather than defaulting to `db`, so a call site cannot quietly record
 * outside the transaction it belongs to.
 */
export async function recordAudit(
  tx: DbExecutor,
  actor: { id: number | null, label: string },
  input: AuditInput
): Promise<void> {
  await tx.insert(schema.auditLogs).values({
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
