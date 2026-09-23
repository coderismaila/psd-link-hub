<script setup lang="ts">
import { useDraggable } from 'vue-draggable-plus'
import type { DropdownMenuItem } from '@nuxt/ui'
import { categoryHex } from '#shared/schemas/category'
import type { LinkWithPrefs } from '#shared/types/link'

const { quickAccess, pending, toggleQuickAccess, handleReorder, moveQuickAccess } = useQuickAccess()

const toast = useToast()
const { copy } = useClipboard()

/**
 * Sortable is attached to the TransitionGroup's own element rather than wrapping the tiles in a
 * draggable component. That way dragging and the menu's Move earlier / Move later both animate:
 * Sortable handles the drag itself, and Vue's FLIP pass handles every other change.
 */
useDraggable('#quick-access-tiles', quickAccess, {
  animation: 180,
  handle: '.drag-handle',
  delay: 150,
  delayOnTouchOnly: true,
  ghostClass: 'opacity-40',
  onUpdate: () => handleReorder()
})

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
        onSelect: () => moveQuickAccess(link, -1)
      },
      {
        label: 'Move later',
        icon: 'i-lucide-arrow-right',
        disabled: index === quickAccess.value.length - 1,
        onSelect: () => moveQuickAccess(link, 1)
      }
    ],
    [
      {
        label: 'Remove from quick access',
        icon: 'i-lucide-pin-off',
        onSelect: () => toggleQuickAccess(link)
      }
    ]
  ]
}
</script>

<template>
  <section aria-labelledby="quick-access-heading" class="flex flex-col gap-2">
    <div class="flex items-center gap-2">
      <UIcon name="i-lucide-pin" class="size-4 text-primary" />
      <h2 id="quick-access-heading" class="text-sm font-semibold tracking-wide text-muted uppercase">
        Quick access
      </h2>
      <UBadge v-if="quickAccess.length" color="neutral" variant="subtle" size="sm">
        {{ quickAccess.length }}
      </UBadge>
    </div>

    <div v-if="pending" class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      <USkeleton v-for="placeholder in 4" :key="placeholder" class="h-14 w-full" />
    </div>

    <!--
      Kept mounted even when empty so Sortable always has an element to attach to. Reorder only:
      pinning happens with the pin on a card, so nothing is dragged in from outside.
    -->
    <TransitionGroup
      v-show="!pending"
      id="quick-access-tiles"
      tag="div"
      name="tile"
      class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
    >
      <div
        v-for="(link, index) in quickAccess"
        :key="link.id"
        class="ke-card group flex items-center gap-1 rounded-md border border-default bg-gradient-to-br from-primary/8 to-transparent pe-1 ps-1"
      >
        <UButton
          class="drag-handle min-h-10 min-w-8 cursor-grab active:cursor-grabbing"
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
              class="ke-cat-fill size-2 shrink-0 rounded-full transition-transform duration-200 group-hover:scale-125"
              :style="{ '--cat': categoryHex(link.category.color) }"
              :title="link.category.name"
            />
            <span class="truncate text-sm font-semibold tracking-tight transition-colors group-hover:text-primary">{{ link.name }}</span>
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
    </TransitionGroup>

    <p
      v-if="!pending && !quickAccess.length"
      class="rounded-md border border-dashed border-default bg-elevated/30 px-4 py-4 text-sm text-muted"
    >
      Nothing pinned yet — tap the
      <UIcon name="i-lucide-pin" class="mx-0.5 inline-block size-4 align-text-bottom" />
      on any link to keep it here.
    </p>
  </section>
</template>
