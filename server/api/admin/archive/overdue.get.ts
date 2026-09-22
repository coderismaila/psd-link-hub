import type { LinkWithPrefs } from '#shared/types/link'

export default defineEventHandler(async (event): Promise<LinkWithPrefs[]> => {
  const user = await requireAdmin(event)

  return await findOverdueLinks(user.id)
})
