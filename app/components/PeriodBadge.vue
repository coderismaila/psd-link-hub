<script setup lang="ts">
defineProps<{
  label: string
  periodType: 'monthly' | 'yearly'
}>()
</script>

<template>
  <UBadge
    color="neutral"
    variant="outline"
    size="sm"
    :icon="periodType === 'monthly' ? 'i-lucide-calendar-days' : 'i-lucide-calendar-range'"
  >
    {{ label }}
  </UBadge>
</template>
