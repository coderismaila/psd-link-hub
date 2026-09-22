import type { LinkWithPrefs } from '#shared/types/link'

/**
 * The caller's favorites, kept in step with the browse list.
 *
 * Favoriting is always done with the star on a card; the favorites bar only ever reorders what is
 * already there. Every change is applied locally first and the server is told afterwards. If the
 * request fails the list is refetched — server truth, rather than a guess at what the state used
 * to be — and a toast explains what happened.
 */
export function useFavorites() {
  const toast = useToast()

  const { data, status, refresh } = useFetch<LinkWithPrefs[]>('/api/links/favorites', {
    key: 'favorites',
    default: () => [],
    // Nuxt 4 hands back a shallow ref by default. This list is reordered in place by the drag
    // library, so it has to be deeply reactive or the moves never reach the DOM.
    deep: true
  })

  const favorites = data as Ref<LinkWithPrefs[]>

  // The browse list holds its own copy of each link, so its stars have to follow along.
  const { data: browseList } = useNuxtData<LinkWithPrefs[]>('links')

  /**
   * Replaces the row rather than editing it in place, so the change shows up whether the cached
   * list is a deep or a shallow ref.
   */
  function markInBrowseList(linkId: number, favorite: boolean) {
    const list = browseList.value
    if (!list?.some(link => link.id === linkId)) return

    browseList.value = list.map(link =>
      link.id === linkId ? { ...link, isFavorite: favorite } : link
    )
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

  /**
   * Moves one favorite a single place. This is the keyboard and screen-reader path to the same
   * result as dragging, offered from the card menu.
   */
  async function moveFavorite(link: LinkWithPrefs, offset: -1 | 1) {
    const index = favorites.value.findIndex(item => item.id === link.id)
    const destination = index + offset

    if (index === -1 || destination < 0 || destination >= favorites.value.length) {
      return
    }

    const reordered = [...favorites.value]
    const [moved] = reordered.splice(index, 1)
    reordered.splice(destination, 0, moved!)
    favorites.value = reordered

    try {
      await persistOrder()
    } catch (error) {
      await recover('Could not reorder favorites', error)
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
    handleReorder,
    moveFavorite
  }
}
