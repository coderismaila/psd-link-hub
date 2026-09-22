<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'
import type { LinkWithPrefs } from '#shared/types/link'

const props = defineProps<{
  links: LinkWithPrefs[]
  pending?: boolean
}>()

const emit = defineEmits<{
  'toggle-favorite': [link: LinkWithPrefs]
  'archive-mine': [link: LinkWithPrefs]
  'edit': [link: LinkWithPrefs]
  'archive-global': [link: LinkWithPrefs]
  'delete': [link: LinkWithPrefs]
}>()

/**
 * VueDraggable needs a list it owns. This one only ever clones out of here — `put: false` and
 * `sort: false` mean nothing is dropped into it and nothing is reordered — so the copy never
 * drifts from the prop.
 */
const items = ref<LinkWithPrefs[]>([...props.links])

watch(() => props.links, (links) => {
  items.value = [...links]
})
</script>

<template>
  <div v-if="pending" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <div
      v-for="placeholder in 6"
      :key="placeholder"
      class="flex flex-col gap-3 rounded-lg border border-default p-4"
    >
      <USkeleton class="h-5 w-2/3" />
      <USkeleton class="h-4 w-full" />
      <div class="flex gap-2">
        <USkeleton class="h-5 w-20" />
        <USkeleton class="h-5 w-16" />
      </div>
      <USkeleton class="h-10 w-28" />
    </div>
  </div>

  <VueDraggable
    v-else-if="items.length"
    v-model="items"
    :group="{ name: 'links', pull: 'clone', put: false }"
    :sort="false"
    handle=".drag-handle"
    :delay="150"
    :delay-on-touch-only="true"
    :clone="(link: LinkWithPrefs) => ({ ...link })"
    class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
  >
    <LinkCard
      v-for="link in items"
      :key="link.id"
      :link="link"
      @toggle-favorite="emit('toggle-favorite', $event)"
      @archive-mine="emit('archive-mine', $event)"
      @edit="emit('edit', $event)"
      @archive-global="emit('archive-global', $event)"
      @delete="emit('delete', $event)"
    />
  </VueDraggable>

  <slot v-else name="empty" />
</template>
