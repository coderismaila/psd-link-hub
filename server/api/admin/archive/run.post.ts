export default defineEventHandler(async (event) => {
  const actor = await requireAdmin(event)

  // Forced, so "Run archive now" works in manual mode too.
  const archived = await runAutoArchive({ force: true, actor: auditActor(actor) })

  return { archived }
})
