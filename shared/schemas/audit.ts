import * as z from 'zod'
import { AUDIT_ENTITY_TYPES } from '../types/audit'

function blankToUndefined(value: unknown) {
  return value === '' || value === null ? undefined : value
}

/**
 * The trail is the one table here that grows without bound, so reading it is paged rather than
 * returning everything the way the link lists do.
 */
export const auditQuerySchema = z.object({
  entityType: z.preprocess(blankToUndefined, z.enum(AUDIT_ENTITY_TYPES).optional()),
  actorId: z.preprocess(blankToUndefined, z.coerce.number().int().positive().optional()),
  limit: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).max(100).default(50)),
  offset: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).default(0))
})

export type AuditQuery = z.output<typeof auditQuerySchema>
