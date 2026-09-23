import type { LinkWithPrefs } from '#shared/types/link'

/**
 * The caller's quick-access list, kept in step with the browse list.
 *
 * Pinning is always done with the star on a card; the quick-access bar only ever reorders what is
 * already there. Every change is applied locally first and the server is told afterwards. If the
 * request fails the list is refetched — server truth, rather than a guess at what the state used
 * to be — and a toast explains what happened.
 */
export function useQuickAccess() {
  const toast = useToast()

  const { data, status, refresh } = useFetch<LinkWithPrefs[]>('/api/links/quick-access', {
    key: 'quick-access',
    default: () => [],
    // Nuxt 4 hands back a shallow ref by default. This list is reordered in place by the drag
    // library, so it has to be deeply reactive or the moves never reach the DOM.
    deep: true
  })

  const quickAccess = data as Ref<LinkWithPrefs[]>

  /*
   * `status` returns to 'pending' on every refetch, so keying the skeletons off it alone made the
   * whole bar blink out and back each time something was pinned. Skeletons are for the first load
   * only; afterwards the list stays on screen while it revalidates.
   */
  const hasLoaded = ref(false)

  watch(status, (value) => {
    if (value === 'success' || value === 'error') hasLoaded.value = true
  }, { immediate: true })

  // The browse list holds its own copy of each link, so its stars have to follow along.
  const { data: browseList } = useNuxtData<LinkWithPrefs[]>('links')

  /**
   * Replaces the row rather than editing it in place, so the change shows up whether the cached
   * list is a deep or a shallow ref.
   */
  function markInBrowseList(linkId: number, pinned: boolean) {
    const list = browseList.value
    if (!list?.some(link => link.id === linkId)) return

    browseList.value = list.map(link =>
      link.id === linkId ? { ...link, isQuickAccess: pinned } : link
    )
  }

  async function recover(title: string, error: unknown) {
    await refresh()

    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({ title, description: message || 'Your change was not saved.', color: 'error' })
  }

  /** Sends the current order of the list to the server. */
  async function persistOrder() {
    await $fetch('/api/quick-access/order', {
      method: 'PUT',
      body: { linkIds: quickAccess.value.map(item => item.id) }
    })
  }

  async function toggleQuickAccess(link: LinkWithPrefs) {
    const pinned = !link.isQuickAccess
    const previous = [...quickAccess.value]

    quickAccess.value = pinned
      ? [...previous, { ...link, isQuickAccess: true }]
      : previous.filter(item => item.id !== link.id)

    markInBrowseList(link.id, pinned)

    try {
      // No refetch on success: the list already shows the right thing, and refetching would
      // throw the bar back into its loading state for no gain. Order is implied by position,
      // and the server owns the persisted value.
      await $fetch(`/api/links/${link.id}/quick-access`, { method: 'PUT', body: { pinned } })
    } catch (error) {
      markInBrowseList(link.id, !pinned)
      await recover(pinned ? 'Could not add to quick access' : 'Could not remove from quick access', error)
    }
  }

  /**
   * Moves one pinned link a single place. This is the keyboard and screen-reader path to the same
   * result as dragging, offered from the card menu.
   */
  async function moveQuickAccess(link: LinkWithPrefs, offset: -1 | 1) {
    const index = quickAccess.value.findIndex(item => item.id === link.id)
    const destination = index + offset

    if (index === -1 || destination < 0 || destination >= quickAccess.value.length) {
      return
    }

    const reordered = [...quickAccess.value]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(destination, 0, moved!)
    quickAccess.value = reordered

    try {
      await persistOrder()
    } catch (error) {
      await recover('Could not reorder quick access', error)
    }
  }

  /** Tiles were dragged into a new order within the bar. */
  async function handleReorder() {
    try {
      await persistOrder()
    } catch (error) {
      await recover('Could not reorder quick access', error)
    }
  }

  return {
    quickAccess,
    pending: computed(() => status.value === 'pending' && !hasLoaded.value),
    refresh,
    toggleQuickAccess,
    handleReorder,
    moveQuickAccess
  }
}
