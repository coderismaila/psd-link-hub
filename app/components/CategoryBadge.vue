<script setup lang="ts">
import { categoryHex } from '#shared/schemas/category'
import type { CategoryDTO } from '#shared/types/link'

const props = defineProps<{ category: CategoryDTO }>()

const hex = computed(() => categoryHex(props.category.color))
</script>

<template>
  <span
    class="ke-cat inline-flex items-center rounded-md border px-1.5 py-0.5 text-xs font-medium"
    :style="{ '--cat': hex }"
  >
    {{ category.name }}
  </span>
</template>
