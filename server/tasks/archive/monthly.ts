export default defineTask({
  meta: {
    name: 'archive:monthly',
    description: 'Archive monthly links whose grace period has passed'
  },
  async run() {
    const archived = await runAutoArchive()
    console.log(`[archive:monthly] Archived ${archived} link(s).`)

    return { result: { archived } }
  }
})
