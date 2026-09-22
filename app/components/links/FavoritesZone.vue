<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { LinkWithPrefs } from '#shared/types/link'

const emit = defineEmits<{
  'archive-mine': [link: LinkWithPrefs]
  'edit': [link: LinkWithPrefs]
  'archive-global': [link: LinkWithPrefs]
  'delete': [link: LinkWithPrefs]
}>()

const { favorites, pending, toggleFavorite, handleDrop, handleReorder, moveFavorite } = useFavorites()
</script>

<template>
  <section aria-labelledby="favorites-heading" class="flex flex-col gap-3">
    <div class="flex items-center gap-2">
      <h2 id="favorites-heading" class="font-semibold">
        Favorites
      </h2>
      <UBadge v-if="favorites.length" color="neutral" variant="subtle" size="sm">
        {{ favorites.length }}
      </UBadge>
    </div>

    <div v-if="pending" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <USkeleton v-for="placeholder in 3" :key="placeholder" class="h-40 w-full" />
    </div>

    <!--
      Accepts cards dragged from the list and sorts its own. The touch delay keeps a tap on the
      star or the Open button from being read as the start of a drag.
    -->
    <VueDraggable
      v-else
      v-model="favorites"
      :group="{ name: 'links', pull: false, put: true }"
      handle=".drag-handle"
      :delay="150"
      :delay-on-touch-only="true"
      ghost-class="opacity-40"
      class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
      :class="favorites.length ? undefined : 'block'"
      @add="handleDrop"
      @update="handleReorder"
    >
      <LinkCard
        v-for="(link, index) in favorites"
        :key="link.id"
        :link="link"
        :position="{ index, total: favorites.length }"
        @toggle-favorite="toggleFavorite"
        @move-up="moveFavorite($event, -1)"
        @move-down="moveFavorite($event, 1)"
        @archive-mine="emit('archive-mine', $event)"
        @edit="emit('edit', $event)"
        @archive-global="emit('archive-global', $event)"
        @delete="emit('delete', $event)"
      />

      <EmptyState
        v-if="!favorites.length"
        icon="i-lucide-star"
        title="No favorites yet"
        description="Drag links here, or tap the star on any card."
      />
    </VueDraggable>
  </section>
</template>
