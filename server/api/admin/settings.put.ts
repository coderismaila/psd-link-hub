import { archiveSettingsBodySchema } from '#shared/schemas/archive'

export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const body = await readValidatedBody(event, archiveSettingsBodySchema.parse)

  // `lastRunAt` is written by the archive run itself, never by the settings form.
  return await updateSettings(body)
})
