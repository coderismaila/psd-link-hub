import * as z from 'zod'
import { linkFiltersSchema } from './link'
import { GRACE_DAYS_MAX, GRACE_DAYS_MIN } from '../types/settings'

export const personalArchiveBodySchema = z.object({
  archived: z.boolean()
})

export const archivedQuerySchema = linkFiltersSchema.extend({
  /** `mine` is the caller's personal archive; `global` is what an admin or the system archived. */
  scope: z.enum(['mine', 'global']).default('mine')
})

export const archiveSettingsBodySchema = z.object({
  mode: z.enum(['auto', 'manual']),
  graceDays: z.number().int()
    .min(GRACE_DAYS_MIN, `Use at least ${GRACE_DAYS_MIN} days`)
    .max(GRACE_DAYS_MAX, `Use at most ${GRACE_DAYS_MAX} days`),
  includeYearly: z.boolean()
})

export type ArchivedQuery = z.output<typeof archivedQuerySchema>
export type ArchiveSettingsBody = z.output<typeof archiveSettingsBodySchema>
