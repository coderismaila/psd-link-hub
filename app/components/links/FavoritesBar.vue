<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { DropdownMenuItem } from '@nuxt/ui'
import type { LinkWithPrefs } from '#shared/types/link'

const { favorites, pending, toggleFavorite, handleReorder, moveFavorite } = useFavorites()

const toast = useToast()
const { copy } = useClipboard()

/**
 * Literal class names so Tailwind can see every one of them. A category stores a Nuxt UI colour
 * token; anything unrecognised falls back to neutral.
 */
const DOT_CLASSES: Record<string, string> = {
  primary: 'bg-primary',
  secondary: 'bg-secondary',
  success: 'bg-success',
  info: 'bg-info',
  warning: 'bg-warning',
  error: 'bg-error',
  neutral: 'bg-inverted'
}

function dotClass(color: string) {
  return DOT_CLASSES[color] ?? DOT_CLASSES.neutral
}

async function copyUrl(link: LinkWithPrefs) {
  await copy(link.url)
  toast.add({ title: 'Link copied', icon: 'i-lucide-check', color: 'success' })
}

function tileMenu(link: LinkWithPrefs, index: number): DropdownMenuItem[][] {
  return [
    [
      { label: 'Copy link', icon: 'i-lucide-copy', onSelect: () => copyUrl(link) }
    ],
    [
      {
        label: 'Move earlier',
        icon: 'i-lucide-arrow-left',
        disabled: index === 0,
        onSelect: () => moveFavorite(link, -1)
      },
      {
        label: 'Move later',
        icon: 'i-lucide-arrow-right',
        disabled: index === favorites.value.length - 1,
        onSelect: () => moveFavorite(link, 1)
      }
    ],
    [
      {
        label: 'Remove from favorites',
        icon: 'i-lucide-star-off',
        onSelect: () => toggleFavorite(link)
      }
    ]
  ]
}
</script>

<template>
  <section aria-labelledby="favorites-heading" class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <h2 id="favorites-heading" class="text-sm font-semibold text-muted uppercase">
        Favorites
      </h2>
      <UBadge v-if="favorites.length" color="neutral" variant="subtle" size="sm">
        {{ favorites.length }}
      </UBadge>
    </div>

    <div v-if="pending" class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <USkeleton v-for="placeholder in 4" :key="placeholder" class="h-14 w-full" />
    </div>

    <!--
      Reorder only. Favoriting happens with the star on a card, so nothing is dragged in from
      outside and there is no second copy of a card to keep in step.
    -->
    <VueDraggable
      v-else-if="favorites.length"
      v-model="favorites"
      :group="{ name: 'favorites', pull: false, put: false }"
      handle=".drag-handle"
      :delay="150"
      :delay-on-touch-only="true"
      ghost-class="opacity-40"
      class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      @update="handleReorder"
    >
      <div
        v-for="(link, index) in favorites"
        :key="link.id"
        class="flex items-center gap-1 rounded-lg border border-default bg-elevated/40 pe-1 ps-1"
      >
        <UButton
          class="drag-handle min-h-10 min-w-8 cursor-grab"
          color="neutral"
          variant="ghost"
          size="sm"
          icon="i-lucide-grip-vertical"
          tabindex="-1"
          aria-hidden="true"
        />

        <a
          :href="link.url"
          target="_blank"
          rel="noopener"
          class="flex min-h-10 min-w-0 flex-1 flex-col justify-center py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <span class="flex items-center gap-1.5">
            <span
              class="size-2 shrink-0 rounded-full"
              :class="dotClass(link.category.color)"
              :title="link.category.name"
            />
            <span class="truncate text-sm font-medium">{{ link.name }}</span>
          </span>
          <span class="ps-3.5 text-xs text-muted">{{ link.periodLabel }}</span>
        </a>

        <UDropdownMenu :items="tileMenu(link, index)">
          <UButton
            color="neutral"
            variant="ghost"
            size="sm"
            icon="i-lucide-ellipsis-vertical"
            class="min-h-10 min-w-8"
            :aria-label="`Actions for ${link.name}`"
          />
        </UDropdownMenu>
      </div>
    </VueDraggable>

    <p v-else class="rounded-lg border border-dashed border-default px-4 py-3 text-sm text-muted">
      No favorites yet. Tap the star on any link to pin it here.
    </p>
  </section>
</template>
