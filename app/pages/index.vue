<script setup lang="ts">
import { linkFiltersSchema, type LinkFilters } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

useHead({ title: 'Links — PSD Link Hub' })

const route = useRoute()
const router = useRouter()

/**
 * Filters live in the URL so a filtered view can be shared and survives a reload. Anything the
 * schema rejects is dropped rather than failing the page.
 */
const parsed = linkFiltersSchema.safeParse(route.query)
const filters = ref<Partial<LinkFilters>>(parsed.success ? parsed.data : {})

watch(filters, (value) => {
  const query = Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && entry !== '')
      .map(([key, entry]) => [key, String(entry)])
  )

  router.replace({ query })
}, { deep: true })

const { links, pending, error } = useLinks(filters)

const toast = useToast()

// Favorites and the archive actions arrive in Phases 4 and 6; until then the card actions that
// need them are acknowledged rather than silently doing nothing.
function notYetAvailable() {
  toast.add({ title: 'Coming in a later phase', icon: 'i-lucide-info', color: 'info' })
}

function onToggleFavorite(_link: LinkWithPrefs) {
  notYetAvailable()
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <LinkFilters v-model="filters" />

    <UAlert
      v-if="error"
      color="error"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="Could not load links"
      :description="error.statusMessage || 'Please try again.'"
    />

    <LinkList
      v-else
      :links="links"
      :pending="pending"
      @toggle-favorite="onToggleFavorite"
      @archive-mine="notYetAvailable"
      @edit="notYetAvailable"
      @archive-global="notYetAvailable"
      @delete="notYetAvailable"
    >
      <template #empty>
        <EmptyState
          icon="i-lucide-link"
          title="No links found"
          description="Try clearing the filters, or ask an admin to add the sheet you are looking for."
        />
      </template>
    </LinkList>
  </div>
</template>
