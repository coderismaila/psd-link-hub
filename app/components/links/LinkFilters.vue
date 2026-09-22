<script setup lang="ts">
import type { LinkFilters } from '#shared/schemas/link'

const filters = defineModel<Partial<LinkFilters>>({ required: true })

const { categories } = useCategories()

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

const categoryItems = computed(() => [
  { label: 'All categories', value: undefined },
  ...categories.value.map(category => ({ label: category.name, value: category.id }))
])

const periodTypeItems = [
  { label: 'All types', value: undefined },
  { label: 'Monthly', value: 'monthly' },
  { label: 'Yearly', value: 'yearly' }
]

const monthItems = [
  { label: 'All months', value: undefined },
  ...Array.from({ length: 12 }, (_, index) => ({
    label: new Intl.DateTimeFormat('en-GB', { month: 'long' }).format(new Date(2000, index, 1)),
    value: index + 1
  }))
]

const currentYear = new Date().getFullYear()

const yearItems = [
  { label: 'All years', value: undefined },
  ...Array.from({ length: 7 }, (_, index) => {
    const year = currentYear + 1 - index
    return { label: String(year), value: year }
  })
]

const hasFilters = computed(() =>
  Object.values(filters.value).some(value => value !== undefined && value !== '')
)

function clearFilters() {
  search.value = ''
  filters.value = {}
}
</script>

<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
    <UFormField label="Search" class="w-full sm:max-w-xs sm:flex-1">
      <UInput
        v-model="search"
        icon="i-lucide-search"
        placeholder="Name or description"
        class="w-full"
      />
    </UFormField>

    <UFormField label="Category" class="w-full sm:w-44">
      <USelectMenu
        :model-value="categoryItems.find(item => item.value === filters.categoryId)"
        :items="categoryItems"
        class="w-full"
        @update:model-value="filters = { ...filters, categoryId: $event?.value }"
      />
    </UFormField>

    <UFormField label="Period type" class="w-full sm:w-36">
      <USelectMenu
        :model-value="periodTypeItems.find(item => item.value === filters.periodType)"
        :items="periodTypeItems"
        class="w-full"
        @update:model-value="filters = { ...filters, periodType: $event?.value as LinkFilters['periodType'] }"
      />
    </UFormField>

    <UFormField label="Month" class="w-full sm:w-36">
      <USelectMenu
        :model-value="monthItems.find(item => item.value === filters.month)"
        :items="monthItems"
        :disabled="filters.periodType === 'yearly'"
        class="w-full"
        @update:model-value="filters = { ...filters, month: $event?.value }"
      />
    </UFormField>

    <UFormField label="Year" class="w-full sm:w-32">
      <USelectMenu
        :model-value="yearItems.find(item => item.value === filters.year)"
        :items="yearItems"
        class="w-full"
        @update:model-value="filters = { ...filters, year: $event?.value }"
      />
    </UFormField>

    <UButton
      v-if="hasFilters"
      color="neutral"
      variant="ghost"
      icon="i-lucide-x"
      class="min-h-10 self-start sm:self-end"
      @click="clearFilters"
    >
      Clear
    </UButton>
  </div>
</template>
