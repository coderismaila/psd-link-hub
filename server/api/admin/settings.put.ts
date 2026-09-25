import { db } from '@nuxthub/db'
import { archiveSettingsBodySchema } from '#shared/schemas/archive'

export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)
  const body = await readValidatedBody(event, archiveSettingsBodySchema.parse)

  return await db.transaction(async (tx) => {
    const before = await getSettings(tx)

    // `lastRunAt` is written by the archive run itself, never by the settings form.
    const after = await updateSettings(body, tx)

    await recordAudit(tx, auditActor(actor), {
      action: 'settings.updated',
      entityType: 'settings',
      summary: `Archive settings: ${after.mode} mode, ${after.graceDays} grace days, yearly ${after.includeYearly ? 'included' : 'excluded'}`,
      changedFields: changedFields(before, body)
    })

    return after
  })
})
