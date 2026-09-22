import type { LinkWithPrefs } from '#shared/types/link'

/** Hides a link from the caller's own view, or brings it back. */
export function usePersonalArchive() {
  const toast = useToast()

  async function setPersonalArchive(link: LinkWithPrefs, archived: boolean) {
    try {
      await $fetch(`/api/links/${link.id}/personal-archive`, {
        method: 'PUT',
        body: { archived }
      })

      toast.add({
        title: archived ? 'Archived for you' : 'Restored',
        description: archived ? `${link.name} is hidden from your list.` : undefined,
        icon: 'i-lucide-check',
        color: 'success'
      })

      return true
    } catch (error) {
      const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
      toast.add({
        title: archived ? 'Could not archive the link' : 'Could not restore the link',
        description: message || 'Please try again.',
        color: 'error'
      })

      return false
    }
  }

  return { setPersonalArchive }
}

/** Archives or restores a link for everyone. Admin only; the server enforces it again. */
export function useGlobalArchive() {
  const toast = useToast()

  async function setGlobalArchive(link: LinkWithPrefs, archived: boolean) {
    try {
      await $fetch(`/api/links/${link.id}/${archived ? 'archive' : 'restore'}`, { method: 'POST' })

      toast.add({
        title: archived ? 'Archived for everyone' : 'Restored for everyone',
        icon: 'i-lucide-check',
        color: 'success'
      })

      return true
    } catch (error) {
      const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
      toast.add({
        title: archived ? 'Could not archive the link' : 'Could not restore the link',
        description: message || 'Please try again.',
        color: 'error'
      })

      return false
    }
  }

  return { setGlobalArchive }
}
