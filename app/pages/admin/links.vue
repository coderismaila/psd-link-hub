<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import { nextPeriod, type LinkBodyInput } from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Manage links — PSD Link Hub' })

const toast = useToast()

// No filters here: the table is the full active list.
const filters = ref({})
const { links, pending, refresh } = useLinks(filters, { key: 'admin-links' })

const { categories } = useCategories()

const formOpen = ref(false)
const editingId = ref<number | null>(null)
const editingCreatedAt = ref<string | null>(null)
const formInitial = ref<LinkBodyInput>(blankLink())

const confirmOpen = ref(false)
const deleting = ref<LinkWithPrefs | null>(null)
const deletePending = ref(false)

function blankLink(): LinkBodyInput {
  const now = new Date()

  return {
    name: '',
    description: '',
    url: '',
    categoryId: categories.value[0]?.id ?? 0,
    periodType: 'monthly',
    periodYear: now.getFullYear(),
    periodMonth: now.getMonth() + 1
  }
}

function toBody(link: LinkWithPrefs): LinkBodyInput {
  return {
    name: link.name,
    description: link.description,
    url: link.url,
    categoryId: link.categoryId,
    periodType: link.periodType,
    periodYear: link.periodYear,
    periodMonth: link.periodMonth
  }
}

function openCreate() {
  editingId.value = null
  editingCreatedAt.value = null
  formInitial.value = blankLink()
  formOpen.value = true
}

function openEdit(link: LinkWithPrefs) {
  editingId.value = link.id
  editingCreatedAt.value = link.createdAt
  formInitial.value = toBody(link)
  formOpen.value = true
}

/** Opens the create form pre-filled with this link pushed one period forward. */
function openDuplicate(link: LinkWithPrefs) {
  const period = nextPeriod(link)

  editingId.value = null
  editingCreatedAt.value = null
  formInitial.value = { ...toBody(link), ...period }
  formOpen.value = true
}

function askDelete(link: LinkWithPrefs) {
  deleting.value = link
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!deleting.value) return

  deletePending.value = true

  try {
    await $fetch(`/api/links/${deleting.value.id}`, { method: 'DELETE' })
    toast.add({ title: 'Link deleted', icon: 'i-lucide-check', color: 'success' })
    confirmOpen.value = false
    await refresh()
  } catch (error) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({
      title: 'Could not delete the link',
      description: message || 'Please try again.',
      color: 'error'
    })
  } finally {
    deletePending.value = false
  }
}

function rowMenu(link: LinkWithPrefs): DropdownMenuItem[][] {
  return [
    [
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(link) },
      {
        label: 'Duplicate for next period',
        icon: 'i-lucide-copy-plus',
        onSelect: () => openDuplicate(link)
      }
    ],
    [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(link) }]
  ]
}

const columns: TableColumn<LinkWithPrefs>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'categoryId', header: 'Category' },
  { accessorKey: 'periodLabel', header: 'Period' },
  { accessorKey: 'createdAt', header: 'Added' },
  { id: 'actions', header: '' }
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(value))
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex items-center justify-between gap-3">
      <p class="text-sm text-muted">
        {{ links.length }} active {{ links.length === 1 ? 'link' : 'links' }}
      </p>

      <UButton icon="i-lucide-plus" class="min-h-10" @click="openCreate">
        New link
      </UButton>
    </div>

    <UAlert
      v-if="!categories.length"
      color="warning"
      variant="subtle"
      icon="i-lucide-triangle-alert"
      title="No categories yet"
      description="Every link needs a category. Create one first."
    >
      <template #actions>
        <UButton to="/admin/categories" size="sm" color="warning" variant="solid">
          Go to categories
        </UButton>
      </template>
    </UAlert>

    <!-- A table needs horizontal room; narrow screens get the same rows as cards. -->
    <UTable
      :data="links"
      :columns="columns"
      :loading="pending"
      class="hidden sm:block"
    >
      <template #name-cell="{ row }">
        <div class="flex flex-col">
          <span class="font-medium">{{ row.original.name }}</span>
          <span v-if="row.original.description" class="line-clamp-1 text-xs text-muted">
            {{ row.original.description }}
          </span>
        </div>
      </template>

      <template #categoryId-cell="{ row }">
        <CategoryBadge :category="row.original.category" />
      </template>

      <template #periodLabel-cell="{ row }">
        <PeriodBadge :label="row.original.periodLabel" :period-type="row.original.periodType" />
      </template>

      <template #createdAt-cell="{ row }">
        <span class="text-sm text-muted">{{ formatDate(row.original.createdAt) }}</span>
      </template>

      <template #actions-cell="{ row }">
        <div class="flex justify-end">
          <UDropdownMenu :items="rowMenu(row.original)">
            <UButton
              color="neutral"
              variant="ghost"
              icon="i-lucide-ellipsis-vertical"
              :aria-label="`Actions for ${row.original.name}`"
            />
          </UDropdownMenu>
        </div>
      </template>

      <template #empty>
        <EmptyState
          icon="i-lucide-link"
          title="No links yet"
          description="Add the first sheet for your team."
        />
      </template>
    </UTable>

    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="link in links"
        :key="link.id"
        class="flex flex-col gap-2 rounded-lg border border-default p-4"
      >
        <div class="flex items-start gap-2">
          <span class="min-w-0 flex-1 font-medium">{{ link.name }}</span>

          <UDropdownMenu :items="rowMenu(link)">
            <UButton
              color="neutral"
              variant="ghost"
              size="sm"
              icon="i-lucide-ellipsis-vertical"
              class="min-h-10"
              :aria-label="`Actions for ${link.name}`"
            />
          </UDropdownMenu>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <CategoryBadge :category="link.category" />
          <PeriodBadge :label="link.periodLabel" :period-type="link.periodType" />
        </div>

        <p class="text-xs text-dimmed">
          Added {{ formatDate(link.createdAt) }}
        </p>
      </div>

      <EmptyState
        v-if="!links.length && !pending"
        icon="i-lucide-link"
        title="No links yet"
        description="Add the first sheet for your team."
      />
    </div>

    <LinkFormModal
      v-model:open="formOpen"
      :link-id="editingId"
      :initial="formInitial"
      :created-at="editingCreatedAt"
      @saved="refresh"
    />

    <ConfirmModal
      v-model:open="confirmOpen"
      title="Delete this link?"
      :description="`${deleting?.name} will be removed for everyone, along with everyone's quick-access entries for it. This cannot be undone.`"
      confirm-label="Delete"
      :loading="deletePending"
      @confirm="confirmDelete"
    />
  </div>
</template>
