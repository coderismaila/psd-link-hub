<script setup lang="ts">
withDefaults(defineProps<{
  icon?: string
  title: string
  description?: string
}>(), {
  icon: 'i-lucide-inbox',
  description: undefined
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-default px-6 py-12 text-center">
    <UIcon :name="icon" class="size-8 text-dimmed" />

    <p class="font-medium">
      {{ title }}
    </p>

    <p v-if="description" class="max-w-sm text-sm text-muted">
      {{ description }}
    </p>

    <slot />
  </div>
</template>
