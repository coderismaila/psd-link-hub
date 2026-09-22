<script setup lang="ts">
withDefaults(defineProps<{
  /** Crops to the "ke" monogram, for the collapsed sidebar and small spaces. */
  compact?: boolean
  /** Tailwind height class for the full lockup. */
  height?: string
}>(), {
  compact: false,
  height: 'h-8'
})
</script>

<template>
  <!--
    The wordmark is a deep green that all but disappears on a dark surface, so it gets a
    brightness lift in dark mode rather than a second asset.
  -->
  <span
    v-if="compact"
    class="block size-8 shrink-0 overflow-hidden rounded-md"
  >
    <img
      src="/ke-logo.png"
      alt="Kaduna Electric"
      class="h-8 max-w-none object-cover object-left dark:brightness-[1.7]"
      width="447"
      height="141"
    >
  </span>

  <img
    v-else
    src="/ke-logo.png"
    alt="Kaduna Electric"
    :class="[height, 'w-auto shrink-0 dark:brightness-[1.7]']"
    width="447"
    height="141"
  >
</template>
