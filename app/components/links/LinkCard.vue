<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'
import { categoryHex } from '#shared/schemas/category'
import type { LinkWithPrefs } from '#shared/types/link'

const props = defineProps<{ link: LinkWithPrefs }>()

const emit = defineEmits<{
  'toggle-quick-access': [link: LinkWithPrefs]
  'archive-mine': [link: LinkWithPrefs]
  'edit': [link: LinkWithPrefs]
  'archive-global': [link: LinkWithPrefs]
  'delete': [link: LinkWithPrefs]
}>()

const { user } = useUserSession()
const isAdmin = computed(() => user.value?.role === 'admin')

const accentHex = computed(() => categoryHex(props.link.category.color))

const toast = useToast()
const { copy } = useClipboard()

async function copyUrl() {
  await copy(props.link.url)
  toast.add({ title: 'Link copied', icon: 'i-lucide-check', color: 'success' })
}

const createdOn = computed(() =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(props.link.createdAt))
)

const menuItems = computed<DropdownMenuItem[][]>(() => {
  const items: DropdownMenuItem[][] = []

  items.push([
    {
      label: 'Copy link',
      icon: 'i-lucide-copy',
      onSelect: copyUrl
    },
    {
      label: 'Archive for me',
      icon: 'i-lucide-eye-off',
      onSelect: () => emit('archive-mine', props.link)
    }
  ])

  if (isAdmin.value) {
    items.push([
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => emit('edit', props.link) },
      {
        label: 'Archive for everyone',
        icon: 'i-lucide-archive',
        onSelect: () => emit('archive-global', props.link)
      },
      {
        label: 'Delete',
        icon: 'i-lucide-trash-2',
        color: 'error',
        onSelect: () => emit('delete', props.link)
      }
    ])
  }

  return items
})
</script>

<template>
  <div class="ke-card group relative flex h-full flex-col gap-3 overflow-hidden rounded-md border border-default bg-default p-4">
    <!-- A hairline of the category colour, so the grid is scannable by colour alone. -->
    <span
      aria-hidden="true"
      class="ke-cat-fill absolute inset-x-0 top-0 h-0.5"
      :style="{ '--cat': accentHex }"
    />

    <div class="flex items-start gap-2">

      <h3
        class="min-w-0 flex-1 truncate font-semibold tracking-tight group-hover:text-primary"
        :title="link.name"
      >
        {{ link.name }}
      </h3>

      <UButton
        :icon="link.isQuickAccess ? 'i-lucide-pin' : 'i-lucide-pin-off'"
        :color="link.isQuickAccess ? 'primary' : 'neutral'"
        variant="ghost"
        size="sm"
        class="min-h-10 min-w-10"
        :aria-label="link.isQuickAccess ? `Remove ${link.name} from quick access` : `Add ${link.name} to quick access`"
        :aria-pressed="link.isQuickAccess"
        @click="emit('toggle-quick-access', link)"
      />
    </div>

    <p v-if="link.description" class="line-clamp-2 text-sm text-muted">
      {{ link.description }}
    </p>

    <div class="flex flex-wrap items-center gap-2">
      <CategoryBadge :category="link.category" />
      <PeriodBadge :label="link.periodLabel" :period-type="link.periodType" />
    </div>

    <p class="text-xs text-dimmed">
      Added {{ createdOn }}
    </p>

    <div class="mt-auto flex items-center gap-2 pt-1">
      <UButton
        :to="link.url"
        target="_blank"
        rel="noopener"
        external
        icon="i-lucide-external-link"
        size="sm"
        class="min-h-10"
      >
        Open
      </UButton>

      <UButton
        color="neutral"
        variant="outline"
        size="sm"
        icon="i-lucide-copy"
        class="min-h-10"
        :aria-label="`Copy link to ${link.name}`"
        @click="copyUrl"
      />

      <UDropdownMenu :items="menuItems" class="ms-auto">
        <UButton
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-ellipsis-vertical"
          class="min-h-10"
          :aria-label="`More actions for ${link.name}`"
        />
      </UDropdownMenu>
    </div>
  </div>
</template>
