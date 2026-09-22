export default defineEventHandler(async (event) => {
  await requireAdmin(event)

  // Forced, so "Run archive now" works in manual mode too.
  const archived = await runAutoArchive({ force: true })

  return { archived }
})
