<script setup lang="ts">
import type { BadgeProps } from '@nuxt/ui'
import { CATEGORY_COLORS, type CategoryColor } from '#shared/schemas/category'
import type { CategoryDTO } from '#shared/types/link'

const props = defineProps<{ category: CategoryDTO }>()

// Categories store a Nuxt UI colour token. Fall back to neutral if an unknown value was stored.
const color = computed<BadgeProps['color']>(() =>
  CATEGORY_COLORS.includes(props.category.color as CategoryColor)
    ? props.category.color as CategoryColor
    : 'neutral'
)
</script>

<template>
  <UBadge :color="color" variant="subtle" size="sm">
    {{ category.name }}
  </UBadge>
</template>
