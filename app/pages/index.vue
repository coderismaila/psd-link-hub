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

const { links, pending, error, refresh } = useLinks(filters)
const { toggleFavorite, refresh: refreshFavorites } = useFavorites()
const { setPersonalArchive } = usePersonalArchive()
const { setGlobalArchive } = useGlobalArchive()

async function reload() {
  await Promise.all([refresh(), refreshFavorites()])
}

async function archiveForMe(link: LinkWithPrefs) {
  if (await setPersonalArchive(link, true)) {
    await reload()
  }
}

async function archiveForEveryone(link: LinkWithPrefs) {
  if (await setGlobalArchive(link, true)) {
    await reload()
  }
}

// Editing and deleting live on /admin/links, which is where the card menu sends admins.
function goToAdminLinks() {
  return navigateTo('/admin/links')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <!-- A launcher for the sheets this user opens daily, not a second copy of the list below. -->
    <FavoritesBar />

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
        @toggle-favorite="toggleFavorite"
        @archive-mine="archiveForMe"
        @edit="goToAdminLinks"
        @archive-global="archiveForEveryone"
        @delete="goToAdminLinks"
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
  </div>
</template>
