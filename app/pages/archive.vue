<script setup lang="ts">
import type { TabsItem } from '@nuxt/ui'
import { linkFiltersSchema, type LinkFilters } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

useHead({ title: 'Archive — PSD Link Hub' })

const route = useRoute()
const router = useRouter()
const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

const { setPersonalArchive } = usePersonalArchive()
const { setGlobalArchive } = useGlobalArchive()

const scope = ref<'mine' | 'global'>(route.query.scope === 'global' ? 'global' : 'mine')

const parsed = linkFiltersSchema.safeParse(route.query)
const filters = ref<Partial<LinkFilters>>(parsed.success ? parsed.data : {})

const query = computed(() => ({
  scope: scope.value,
  ...Object.fromEntries(
    Object.entries(filters.value).filter(([, value]) => value !== undefined && value !== '')
  )
}))

watch(query, value => router.replace({ query: value as Record<string, string> }), { deep: true })

const { data: links, status, refresh } = useFetch<LinkWithPrefs[]>('/api/links/archived', {
  key: 'archived-links',
  query,
  default: () => []
})

const pending = computed(() => status.value === 'pending')

const tabs: TabsItem[] = [
  { label: 'Archived by me', icon: 'i-lucide-eye-off', value: 'mine' },
  { label: 'Archived for everyone', icon: 'i-lucide-archive', value: 'global' }
]

async function restoreForMe(link: LinkWithPrefs) {
  if (await setPersonalArchive(link, false)) {
    await refresh()
  }
}

async function restoreForEveryone(link: LinkWithPrefs) {
  if (await setGlobalArchive(link, false)) {
    await refresh()
  }
}

function archivedOn(link: LinkWithPrefs) {
  if (!link.archivedAt) return null

  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(link.archivedAt))
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <UTabs v-model="scope" :items="tabs" size="sm" />

    <LinkFilters v-model="filters" />

    <div v-if="pending" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="placeholder in 3" :key="placeholder" class="h-36 w-full" />
    </div>

    <!-- Restoring a link removes it from this list; the card leaving says so. -->
    <TransitionGroup
      v-else-if="links.length"
      tag="div"
      name="card"
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <div
        v-for="link in links"
        :key="link.id"
        class="ke-card flex h-full flex-col gap-3 rounded-md border border-default bg-default p-4"
      >
        <h3 class="font-medium">
          {{ link.name }}
        </h3>

        <p v-if="link.description" class="line-clamp-2 text-sm text-muted">
          {{ link.description }}
        </p>

        <div class="flex flex-wrap items-center gap-2">
          <CategoryBadge :category="link.category" />
          <PeriodBadge :label="link.periodLabel" :period-type="link.periodType" />
        </div>

        <p v-if="scope === 'global' && archivedOn(link)" class="text-xs text-dimmed">
          Archived {{ archivedOn(link) }}
          <template v-if="link.archivedBy">
            by {{ link.archivedBy === 'system' ? 'the system' : 'an admin' }}
          </template>
        </p>

        <div class="mt-auto flex items-center gap-2 pt-1">
          <UButton
            :to="link.url"
            target="_blank"
            rel="noopener"
            external
            icon="i-lucide-external-link"
            size="sm"
            color="neutral"
            variant="outline"
            class="min-h-10"
          >
            Open
          </UButton>

          <UButton
            v-if="scope === 'mine'"
            icon="i-lucide-undo-2"
            size="sm"
            class="min-h-10"
            @click="restoreForMe(link)"
          >
            Restore
          </UButton>

          <UButton
            v-else-if="isAdmin"
            icon="i-lucide-undo-2"
            size="sm"
            class="min-h-10"
            @click="restoreForEveryone(link)"
          >
            Restore for everyone
          </UButton>
        </div>
      </div>
    </TransitionGroup>

    <EmptyState
      v-else
      icon="i-lucide-archive"
      :title="scope === 'mine' ? 'Nothing archived by you' : 'Nothing archived for everyone'"
      :description="scope === 'mine'
        ? 'Links you hide from your own list show up here.'
        : 'Monthly links land here once their grace period has passed.'"
    />
  </div>
</template>
