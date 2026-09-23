import type { LinkFilters } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

/**
 * Active links for the current user, refetched whenever the filters change.
 * Blank filters are dropped so they never reach the query string.
 *
 * Pass a `key` to keep a screen's copy separate from the browse list's cache.
 */
export function useLinks(filters: Ref<Partial<LinkFilters>>, options: { key?: string } = {}) {
  const query = computed(() => {
    return Object.fromEntries(
      Object.entries(filters.value).filter(([, value]) => value !== undefined && value !== '')
    )
  })

  const { data, status, error, refresh } = useFetch<LinkWithPrefs[]>('/api/links', {
    key: options.key ?? 'links',
    query,
    default: () => [],
    // Nuxt 4 defaults to a shallow ref. Favoriting updates a single row of this list, which a
    // shallow ref would not notice until the next refetch.
    deep: true
  })

  // Skeletons mean "nothing to show yet". Keeping the current rows on screen while a refetch
  // runs survives both refreshes and remounts, so navigating back to a list is instant.
  return {
    links: data,
    pending: computed(() => status.value === 'pending' && !data.value.length),
    error,
    refresh
  }
}
