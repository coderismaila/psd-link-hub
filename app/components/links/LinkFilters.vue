<script setup lang="ts">
import { categoryHex } from '#shared/schemas/category'
import type { LinkFilters } from '#shared/schemas/link'
import { availableYears } from '#shared/utils/period'

const filters = defineModel<Partial<LinkFilters>>({ required: true })

const { categories } = useCategories()
const { appTimezone } = useRuntimeConfig().public

/** Typing should not fire a request per keystroke, so the search box lands in the model late. */
const search = ref(filters.value.q ?? '')

watchDebounced(search, (value) => {
  filters.value = { ...filters.value, q: value.trim() || undefined }
}, { debounce: 250 })

// Keep the box in step when filters are cleared from elsewhere (the Clear button, or the URL).
watch(() => filters.value.q, (value) => {
  if ((value ?? '') !== search.value.trim()) {
    search.value = value ?? ''
  }
})

/**
 * Segmented controls instead of dropdowns: every one of these has a handful of options, so the
 * choices are worth showing rather than hiding behind a click.
 */
const periodTypeItems = [
  { label: 'All', value: undefined },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' }
]

const yearItems = computed(() => [
  { label: 'All', value: undefined },
  ...availableYears(new Date(), appTimezone, filters.value.year)
    .map(year => ({ label: String(year), value: year }))
])

const monthItems = [
  { label: 'Any month', value: undefined },
  ...Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(2000, index, 1)),
    value: index + 1
  }))
]

/**
 * Every control in this bar is pinned to one height. Inputs size themselves from padding and the
 * radio segments from their variant, so left alone they land a few pixels apart and the row reads
 * as uneven.
 */
const FILTER_HEIGHT = 'h-9'

/**
 * Only the keys this component owns. The admin table passes its status filter through the same
 * model, and that is its business to clear, not ours.
 */
const OWNED_KEYS = ['q', 'categoryId', 'periodType', 'year', 'month'] as const

const hasFilters = computed(() =>
  OWNED_KEYS.some((key) => {
    const value = filters.value[key]
    return value !== undefined && value !== ''
  })
)

function toggleCategory(id: number) {
  filters.value = {
    ...filters.value,
    categoryId: filters.value.categoryId === id ? undefined : id
  }
}

function clearFilters() {
  search.value = ''

  // Rebuild from the keys this component does not own, so anything else passed through survives.
  filters.value = Object.fromEntries(
    Object.entries(filters.value)
      .filter(([key]) => !OWNED_KEYS.includes(key as typeof OWNED_KEYS[number]))
  )
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-wrap items-end gap-3">
      <UFormField label="Search" class="w-full sm:max-w-xs sm:flex-1">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          size="sm"
          placeholder="Name or description"
          class="w-full"
          :ui="{ base: FILTER_HEIGHT }"
        />
      </UFormField>

      <UFormField label="Period">
        <URadioGroup
          :model-value="filters.periodType"
          :items="periodTypeItems"
          variant="table"
          orientation="horizontal"
          indicator="hidden"
          size="sm"
          :ui="{ fieldset: 'flex-row', item: `${FILTER_HEIGHT} items-center justify-center px-3 py-0 text-center` }"
          @update:model-value="filters = { ...filters, periodType: $event as LinkFilters['periodType'] }"
        />
      </UFormField>

      <UFormField label="Year">
        <URadioGroup
          :model-value="filters.year"
          :items="yearItems"
          variant="table"
          orientation="horizontal"
          indicator="hidden"
          size="sm"
          :ui="{ fieldset: 'flex-row', item: `${FILTER_HEIGHT} items-center justify-center px-3 py-0 text-center` }"
          @update:model-value="filters = { ...filters, year: $event as number | undefined }"
        />
      </UFormField>

      <!-- Twelve options plus "any" is the one place a menu still beats showing everything. -->
      <UFormField v-if="filters.periodType !== 'yearly'" label="Month" class="w-full sm:w-40">
        <USelectMenu
          :model-value="monthItems.find(item => item.value === filters.month)"
          :items="monthItems"
          size="sm"
          class="w-full"
          :ui="{ base: FILTER_HEIGHT }"
          @update:model-value="filters = { ...filters, month: $event?.value }"
        />
      </UFormField>

      <UButton
        v-if="hasFilters"
        color="neutral"
        variant="ghost"
        icon="i-lucide-x"
        size="sm"
        :class="FILTER_HEIGHT"
        @click="clearFilters"
      >
        Clear
      </UButton>
    </div>

    <!-- Categories carry a colour, so showing them beats naming them in a list. -->
    <div v-if="categories.length" class="flex flex-wrap gap-1.5">
      <button
        v-for="category in categories"
        :key="category.id"
        type="button"
        :aria-pressed="filters.categoryId === category.id"
        class="ke-cat inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        :class="filters.categoryId === category.id ? 'ring-2 ring-inverted' : 'opacity-70 hover:opacity-100'"
        :style="{ '--cat': categoryHex(category.color) }"
        @click="toggleCategory(category.id)"
      >
        <span class="ke-cat-fill size-2 rounded-full" :style="{ '--cat': categoryHex(category.color) }" />
        {{ category.name }}
      </button>
    </div>
  </div>
</template>
