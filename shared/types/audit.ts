export const AUDIT_ENTITY_TYPES = ['link', 'category', 'user', 'settings', 'archive'] as const

export type AuditEntityType = (typeof AUDIT_ENTITY_TYPES)[number]

/** A single recorded change, as sent to the client. */
export interface AuditEntryDTO {
  id: number
  actorId: number | null
  actorLabel: string
  action: string
  entityType: AuditEntityType
  entityId: number | null
  entityLabel: string | null
  summary: string
  /** Field names an update touched, when the action was an update. */
  changedFields: string[]
  createdAt: string
}

export interface AuditPage {
  entries: AuditEntryDTO[]
  total: number
}
