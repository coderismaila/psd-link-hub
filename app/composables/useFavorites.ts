import type { LinkWithPrefs } from '#shared/types/link'

/** The only part of a SortableJS drop event this app needs. */
export interface DragDropEvent {
  newIndex?: number
}

/**
 * The caller's favorites, kept in step with the browse list.
 *
 * Every change is applied locally first and the server is told afterwards. If the request fails
 * the list is refetched — server truth, rather than a guess at what the state used to be — and a
 * toast explains what happened.
 */
export function useFavorites() {
  const toast = useToast()

  const { data, status, refresh } = useFetch<LinkWithPrefs[]>('/api/links/favorites', {
    key: 'favorites',
    default: () => []
  })

  const favorites = data as Ref<LinkWithPrefs[]>

  // The browse list holds its own copy of each link, so its stars have to follow along.
  const { data: browseList } = useNuxtData<LinkWithPrefs[]>('links')

  function markInBrowseList(linkId: number, favorite: boolean) {
    const row = browseList.value?.find(link => link.id === linkId)
    if (row) {
      row.isFavorite = favorite
    }
  }

  async function recover(title: string, error: unknown) {
    await refresh()

    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({ title, description: message || 'Your change was not saved.', color: 'error' })
  }

  /** Sends the current order of the list to the server. */
  async function persistOrder() {
    await $fetch('/api/favorites/order', {
      method: 'PUT',
      body: { linkIds: favorites.value.map(favorite => favorite.id) }
    })
  }

  async function toggleFavorite(link: LinkWithPrefs) {
    const favorite = !link.isFavorite
    const previous = [...favorites.value]

    favorites.value = favorite
      ? [...previous, { ...link, isFavorite: true }]
      : previous.filter(item => item.id !== link.id)

    markInBrowseList(link.id, favorite)

    try {
      await $fetch(`/api/links/${link.id}/favorite`, { method: 'PUT', body: { favorite } })
      await refresh()
    } catch (error) {
      markInBrowseList(link.id, !favorite)
      await recover(favorite ? 'Could not add favorite' : 'Could not remove favorite', error)
    }
  }

  /** A card was dropped onto the favorites zone. */
  async function handleDrop(event: DragDropEvent) {
    const index = event.newIndex ?? favorites.value.length - 1
    const dropped = favorites.value[index]

    if (!dropped) return

    // Dropping something that is already a favorite should reorder, not duplicate it.
    const alreadyPresent = favorites.value.some((item, position) =>
      item.id === dropped.id && position !== index
    )

    if (alreadyPresent) {
      favorites.value = favorites.value.filter((_, position) => position !== index)

      try {
        await persistOrder()
      } catch (error) {
        await recover('Could not reorder favorites', error)
      }

      return
    }

    dropped.isFavorite = true
    markInBrowseList(dropped.id, true)

    try {
      await $fetch(`/api/links/${dropped.id}/favorite`, { method: 'PUT', body: { favorite: true } })
      await persistOrder()
      await refresh()
    } catch (error) {
      markInBrowseList(dropped.id, false)
      await recover('Could not add favorite', error)
    }
  }

  /** Favorites were dragged into a new order within the zone. */
  async function handleReorder() {
    try {
      await persistOrder()
    } catch (error) {
      await recover('Could not reorder favorites', error)
    }
  }

  return {
    favorites,
    pending: computed(() => status.value === 'pending'),
    refresh,
    toggleFavorite,
    handleDrop,
    handleReorder
  }
}
