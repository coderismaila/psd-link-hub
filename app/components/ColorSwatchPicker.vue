<script setup lang="ts">
import { CATEGORY_PALETTE } from '#shared/schemas/category'

const model = defineModel<string>({ required: true })
</script>

<template>
  <div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Category colour">
    <button
      v-for="swatch in CATEGORY_PALETTE"
      :key="swatch.hex"
      type="button"
      role="radio"
      :aria-checked="model === swatch.hex"
      :aria-label="swatch.name"
      :title="swatch.name"
      class="size-8 rounded-md ring-offset-2 ring-offset-default transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      :class="model === swatch.hex ? 'ring-2 ring-inverted' : 'hover:scale-110'"
      :style="{ backgroundColor: swatch.hex }"
      @click="model = swatch.hex"
    />
  </div>
</template>
