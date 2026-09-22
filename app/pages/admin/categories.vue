<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import { categoryHex, DEFAULT_CATEGORY_COLOR, type CategoryBody } from '#shared/schemas/category'
import type { CategoryWithCount } from '#shared/types/link'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Categories — PSD Link Hub' })

const toast = useToast()
const { categories, pending, refresh } = useCategories()

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const formInitial = ref<CategoryBody>({ name: '', color: DEFAULT_CATEGORY_COLOR })

const confirmOpen = ref(false)
const deleting = ref<CategoryWithCount | null>(null)
const deletePending = ref(false)

function openCreate() {
  editingId.value = null
  formInitial.value = { name: '', color: DEFAULT_CATEGORY_COLOR }
  formOpen.value = true
}

function openEdit(category: CategoryWithCount) {
  editingId.value = category.id
  formInitial.value = { name: category.name, color: categoryHex(category.color) }
  formOpen.value = true
}

function askDelete(category: CategoryWithCount) {
  deleting.value = category
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return

  deletePending.value = true

  try {
    await $fetch(`/api/categories/${deleting.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Category deleted', icon: 'i-lucide-check', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (error) {
    // The server refuses to delete a category still in use and says how many links hold it.
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({
      title: 'Could not delete the category',
      description: message || 'Please try again.',
      color: 'error'
    })
  } finally {
    deletePending.value = false
  }
}

const columns: TableColumn<CategoryWithCount>[] = [
  { accessorKey: 'name', header: 'Category' },
  { accessorKey: 'linkCount', header: 'Links' },
  { id: 'actions', header: '' }
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-muted">
        {{ categories.length }} {{ categories.length === 1 ? 'category' : 'categories' }}
      </p>

      <UButton icon="i-lucide-plus" class="min-h-10" @click="openCreate">
        New category
      </UButton>
    </div>

    <UTable
      :data="categories"
      :columns="columns"
      :loading="pending"
      class="hidden sm:block"
    >
      <template #name-cell="{ row }">
        <CategoryBadge :category="row.original" />
      </template>

      <template #linkCount-cell="{ row }">
        <span class="text-sm text-muted">{{ row.original.linkCount }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            :aria-label="`Edit ${row.original.name}`"
            @click="openEdit(row.original)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            :disabled="row.original.linkCount > 0"
            :title="row.original.linkCount > 0 ? 'Reassign its links first' : undefined"
            :aria-label="`Delete ${row.original.name}`"
            @click="askDelete(row.original)"
          />
        </div>
      </template>

      <template #empty>
        <EmptyState
          icon="i-lucide-tags"
          title="No categories yet"
          description="Categories group the sheets so people can filter them."
        />
      </template>
    </UTable>

    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="category in categories"
        :key="category.id"
        class="flex items-center justify-between gap-2 rounded-lg border border-default p-4"
      >
        <div class="flex min-w-0 flex-col gap-1">
          <CategoryBadge :category="category" />
          <span class="text-xs text-dimmed">
            {{ category.linkCount }} {{ category.linkCount === 1 ? 'link' : 'links' }}
          </span>
        </div>

        <div class="flex gap-1">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-pencil"
            class="min-h-10"
            :aria-label="`Edit ${category.name}`"
            @click="openEdit(category)"
          />
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-trash-2"
            class="min-h-10"
            :disabled="category.linkCount > 0"
            :aria-label="`Delete ${category.name}`"
            @click="askDelete(category)"
          />
        </div>
      </div>

      <EmptyState
        v-if="!categories.length && !pending"
        icon="i-lucide-tags"
        title="No categories yet"
        description="Categories group the sheets so people can filter them."
      />
    </div>

    <CategoryFormModal
      v-model:open="formOpen"
      :category-id="editingId"
      :initial="formInitial"
      @saved="refresh"
    />

    <ConfirmModal
      v-model:open="confirmOpen"
      title="Delete this category?"
      :description="`${deleting?.name} will be removed. Categories still used by a link cannot be deleted.`"
      confirm-label="Delete"
      :loading="deletePending"
      @confirm="confirmDelete"
    />
  </div>
</template>
