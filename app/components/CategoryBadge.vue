<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import type { CategoryDTO } from '#shared/types/link'

const props = defineProps<{ category: CategoryDTO }>()

// Categories store a Nuxt UI colour token. Fall back to neutral if an unknown value was stored.
const allowed = ['primary', 'secondary', 'success', 'info', 'warning', 'error', 'neutral']

const color = computed<BadgeProps['color']>(() =>
  (allowed.includes(props.category.color) ? props.category.color : 'neutral') as BadgeProps['color']
)
</script>

<template>
  <UBadge :color="color" variant="subtle" size="sm">
    {{ category.name }}
  </UBadge>
</template>
