<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { linkFiltersSchema, type LinkFilters } from '#shared/schemas/link'

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

/**
 * Narrow screens show one section at a time. The switch is plain CSS — `sm:block` wins over the
 * hidden class at the breakpoint — so the server and the browser render the same markup and both
 * sections keep a single instance.
 */
const mobileTab = ref('favorites')

const tabs: TabsItem[] = [
  { label: 'Favorites', icon: 'i-lucide-star', value: 'favorites' },
  { label: 'All links', icon: 'i-lucide-link', value: 'all' }
]

// Editing and deleting live on /admin/links, which is where the card menu sends admins.
function goToAdminLinks() {
  return navigateTo('/admin/links')
}
</script>

<template>
  <div class="flex flex-col gap-6">
    <UTabs
      v-model="mobileTab"
      :items="tabs"
      size="sm"
      class="sm:hidden"
    />

    <div :class="[mobileTab === 'favorites' ? 'block' : 'hidden', 'sm:block']">
      <FavoritesZone
        @archive-mine="archiveForMe"
        @edit="goToAdminLinks"
        @archive-global="archiveForEveryone"
        @delete="goToAdminLinks"
      />
    </div>

    <div :class="[mobileTab === 'all' ? 'block' : 'hidden', 'sm:block']">
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
  </div>
</template>
