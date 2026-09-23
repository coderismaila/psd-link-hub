<script setup lang="ts">
import type { DropdownMenuItem, TableColumn } from '@nuxt/ui'
import {
  adminLinkFiltersSchema,
  nextPeriod,
  type AdminLinkFilters,
  type LinkBodyInput
} from '#shared/schemas/link'
import type { LinkWithPrefs } from '#shared/types/link'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Manage links — PSD Link Hub' })

const toast = useToast()
const route = useRoute()
const router = useRouter()

const parsed = adminLinkFiltersSchema.safeParse(route.query)
const filters = ref<Partial<AdminLinkFilters>>(parsed.success ? parsed.data : { status: 'all' })

watch(filters, (value) => {
  const query = Object.fromEntries(
    Object.entries(value)
      .filter(([, entry]) => entry !== undefined && entry !== '')
      .map(([key, entry]) => [key, String(entry)])
  )

  router.replace({ query })
}, { deep: true })

const query = computed(() =>
  Object.fromEntries(
    Object.entries(filters.value).filter(([, value]) => value !== undefined && value !== '')
  )
)

const { data: links, status, refresh } = useFetch<LinkWithPrefs[]>('/api/admin/links', {
  key: 'admin-links',
  query,
  default: () => [],
  deep: true
})

const pending = computed(() => status.value === 'pending' && !links.value.length)

const { categories } = useCategories()
const { setGlobalArchive } = useGlobalArchive()

const statusItems = [
  { label: 'All', value: 'all' },
  { label: 'Active', value: 'active' },
  { label: 'Archived', value: 'archived' }
]

const counts = computed(() => ({
  total: links.value.length,
  archived: links.value.filter(link => link.status === 'archived').length
}))

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

async function setArchived(link: LinkWithPrefs, archived: boolean) {
  if (await setGlobalArchive(link, archived)) {
    await refresh()
  }
}

function rowMenu(link: LinkWithPrefs): DropdownMenuItem[][] {
  const archived = link.status === 'archived'

  return [
    [
      { label: 'Edit', icon: 'i-lucide-pencil', onSelect: () => openEdit(link) },
      {
        label: 'Duplicate for next period',
        icon: 'i-lucide-copy-plus',
        onSelect: () => openDuplicate(link)
      }
    ],
    [
      archived
        ? {
            label: 'Restore for everyone',
            icon: 'i-lucide-undo-2',
            onSelect: () => setArchived(link, false)
          }
        : {
            label: 'Archive for everyone',
            icon: 'i-lucide-archive',
            onSelect: () => setArchived(link, true)
          }
    ],
    [{ label: 'Delete', icon: 'i-lucide-trash-2', color: 'error', onSelect: () => askDelete(link) }]
  ]
}

const columns: TableColumn<LinkWithPrefs>[] = [
  { accessorKey: 'name', header: 'Name' },
  { accessorKey: 'categoryId', header: 'Category' },
  { accessorKey: 'periodLabel', header: 'Period' },
  { accessorKey: 'status', header: 'Status' },
  { id: 'actions', header: '' }
]

function formatDate(value: string | null) {
  if (!value) return null

  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    .format(new Date(value))
}

/** Says who put a link in the archive, since the system does it on a schedule. */
function archivedNote(link: LinkWithPrefs) {
  const on = formatDate(link.archivedAt)
  const by = link.archivedBy === 'system' ? 'automatically' : 'by an admin'

  return on ? `Archived ${on} ${by}` : `Archived ${by}`
}
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <URadioGroup
          :model-value="filters.status ?? 'all'"
          :items="statusItems"
          variant="table"
          orientation="horizontal"
          indicator="hidden"
          size="sm"
          :ui="{ fieldset: 'flex-row', item: 'h-9 items-center justify-center px-3 py-0 text-center' }"
          @update:model-value="filters = { ...filters, status: $event as AdminLinkFilters['status'] }"
        />

        <p class="text-sm text-muted">
          {{ counts.total }} {{ counts.total === 1 ? 'link' : 'links' }}
          <span v-if="counts.archived && filters.status !== 'archived'">
            · {{ counts.archived }} archived
          </span>
        </p>
      </div>

      <UButton icon="i-lucide-plus" class="min-h-10" @click="openCreate">
        New link
      </UButton>
    </div>

    <LinkFilters v-model="filters" />

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
        <div class="flex flex-col" :class="row.original.status === 'archived' ? 'opacity-60' : undefined">
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

      <template #status-cell="{ row }">
        <UBadge
          v-if="row.original.status === 'archived'"
          color="neutral"
          variant="subtle"
          size="sm"
          icon="i-lucide-archive"
          :title="archivedNote(row.original)"
        >
          Archived
        </UBadge>
        <UBadge v-else color="success" variant="subtle" size="sm">
          Active
        </UBadge>
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
          title="Nothing here"
          description="No link matches these filters."
        />
      </template>
    </UTable>

    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="link in links"
        :key="link.id"
        class="flex flex-col gap-2 rounded-md border border-default p-4"
        :class="link.status === 'archived' ? 'bg-elevated/30' : undefined"
      >
        <div class="flex items-start gap-2">
          <span
            class="min-w-0 flex-1 font-medium"
            :class="link.status === 'archived' ? 'opacity-60' : undefined"
          >
            {{ link.name }}
          </span>

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
          <UBadge
            v-if="link.status === 'archived'"
            color="neutral"
            variant="subtle"
            size="sm"
            icon="i-lucide-archive"
          >
            Archived
          </UBadge>
        </div>

        <p class="text-xs text-dimmed">
          <template v-if="link.status === 'archived'">
            {{ archivedNote(link) }}
          </template>
          <template v-else>
            Added {{ formatDate(link.createdAt) }}
          </template>
        </p>
      </div>

      <EmptyState
        v-if="!links.length && !pending"
        icon="i-lucide-link"
        title="Nothing here"
        description="No link matches these filters."
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
