<script setup lang="ts">
import type { LinkWithPrefs } from '#shared/types/link'

defineProps<{
  links: LinkWithPrefs[]
  pending?: boolean
}>()

const emit = defineEmits<{
  'toggle-quick-access': [link: LinkWithPrefs]
  'archive-mine': [link: LinkWithPrefs]
  'edit': [link: LinkWithPrefs]
  'archive-global': [link: LinkWithPrefs]
  'delete': [link: LinkWithPrefs]
}>()
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

  <div v-else-if="links.length" class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
    <LinkCard
      v-for="link in links"
      :key="link.id"
      :link="link"
      @toggle-quick-access="emit('toggle-quick-access', $event)"
      @archive-mine="emit('archive-mine', $event)"
      @edit="emit('edit', $event)"
      @archive-global="emit('archive-global', $event)"
      @delete="emit('delete', $event)"
    />
  </div>

  <slot v-else name="empty" />
</template>
