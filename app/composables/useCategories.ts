import type { CategoryWithCount } from '#shared/types/link'

/** Shared category list. The `categories` key dedupes the request across components. */
export function useCategories() {
  const { data, status, refresh } = useFetch<CategoryWithCount[]>('/api/categories', {
    key: 'categories',
    default: () => []
  })

  return {
    categories: data,
    pending: computed(() => status.value === 'pending' && !data.value.length),
    refresh
  }
}
