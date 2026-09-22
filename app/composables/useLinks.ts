import type { LinkFilters } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

/**
 * Active links for the current user, refetched whenever the filters change.
 * Blank filters are dropped so they never reach the query string.
 */
export function useLinks(filters: Ref<Partial<LinkFilters>>) {
  const query = computed(() => {
    return Object.fromEntries(
      Object.entries(filters.value).filter(([, value]) => value !== undefined && value !== '')
    )
  })

  const { data, status, error, refresh } = useFetch<LinkWithPrefs[]>('/api/links', {
    key: 'links',
    query,
    default: () => []
  })

  return {
    links: data,
    pending: computed(() => status.value === 'pending'),
    error,
    refresh
  }
}
