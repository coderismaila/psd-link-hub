<script setup lang="ts">
import type { TableColumn } from '@nuxt/ui'
import {
  AUDIT_ENTITY_TYPES,
  type AuditEntityType,
  type AuditEntryDTO,
  type AuditPage
} from '#shared/types/audit'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Audit trail — PSD Link Hub' })

const PAGE_SIZE = 50

const entityType = ref<AuditEntityType | undefined>(undefined)
const page = ref(1)

const query = computed(() => ({
  ...(entityType.value ? { entityType: entityType.value } : {}),
  limit: PAGE_SIZE,
  offset: (page.value - 1) * PAGE_SIZE
}))

const { data, status } = useFetch<AuditPage>('/api/admin/audit', {
  key: 'audit',
  query,
  default: () => ({ entries: [], total: 0 })
})

const pending = computed(() => status.value === 'pending' && !data.value.entries.length)

// Changing the filter invalidates whatever page you were on.
watch(entityType, () => {
  page.value = 1
})

const filterItems: { label: string, value: AuditEntityType | undefined }[] = [
  { label: 'Everything', value: undefined },
  ...AUDIT_ENTITY_TYPES.map(type => ({
    label: type.charAt(0).toUpperCase() + type.slice(1),
    value: type as AuditEntityType | undefined
  }))
]

const ENTITY_ICONS: Record<string, string> = {
  link: 'i-lucide-link',
  category: 'i-lucide-tags',
  user: 'i-lucide-user',
  settings: 'i-lucide-settings',
  archive: 'i-lucide-archive'
}

/** Destructive actions are worth spotting at a glance in a long list. */
function toneFor(action: string) {
  if (action.includes('deleted')) return 'error'
  if (action.includes('archived')) return 'warning'
  if (action.includes('created')) return 'success'
  return 'neutral'
}

function formatWhen(value: string) {
  return new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
    .format(new Date(value))
}

const columns: TableColumn<AuditEntryDTO>[] = [
  { accessorKey: 'createdAt', header: 'When' },
  { accessorKey: 'actorLabel', header: 'Who' },
  { accessorKey: 'summary', header: 'What' },
  { accessorKey: 'entityType', header: 'Area' }
]
</script>

<template>
  <div class="flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <URadioGroup
        v-model="entityType"
        :items="filterItems"
        variant="table"
        orientation="horizontal"
        indicator="hidden"
        size="sm"
        :ui="{ fieldset: 'flex-row flex-wrap', item: 'h-9 items-center justify-center px-3 py-0 text-center' }"
      />

      <p class="text-sm text-muted">
        {{ data.total }} {{ data.total === 1 ? 'entry' : 'entries' }}
      </p>
    </div>

    <UTable :data="data.entries" :columns="columns" :loading="pending" class="hidden sm:block">
      <template #createdAt-cell="{ row }">
        <span class="text-sm whitespace-nowrap text-muted">{{ formatWhen(row.original.createdAt) }}</span>
      </template>

      <template #actorLabel-cell="{ row }">
        <span class="text-sm font-medium">{{ row.original.actorLabel }}</span>
      </template>

      <template #summary-cell="{ row }">
        <div class="flex flex-col">
          <span class="text-sm">{{ row.original.summary }}</span>
          <span v-if="row.original.changedFields.length" class="text-xs text-dimmed">
            changed: {{ row.original.changedFields.join(', ') }}
          </span>
        </div>
      </template>

      <template #entityType-cell="{ row }">
        <UBadge
          :color="toneFor(row.original.action)"
          variant="subtle"
          size="sm"
          :icon="ENTITY_ICONS[row.original.entityType]"
        >
          {{ row.original.entityType }}
        </UBadge>
      </template>

      <template #empty>
        <EmptyState
          icon="i-lucide-scroll-text"
          title="Nothing recorded yet"
          description="Changes to links, categories, users and settings show up here."
        />
      </template>
    </UTable>

    <div class="flex flex-col gap-3 sm:hidden">
      <div
        v-for="entry in data.entries"
        :key="entry.id"
        class="flex flex-col gap-1 rounded-md border border-default p-3"
      >
        <div class="flex items-start justify-between gap-2">
          <span class="text-sm">{{ entry.summary }}</span>
          <UBadge
            :color="toneFor(entry.action)"
            variant="subtle"
            size="sm"
            :icon="ENTITY_ICONS[entry.entityType]"
          />
        </div>
        <span class="text-xs text-dimmed">
          {{ entry.actorLabel }} · {{ formatWhen(entry.createdAt) }}
        </span>
      </div>

      <EmptyState
        v-if="!data.entries.length && !pending"
        icon="i-lucide-scroll-text"
        title="Nothing recorded yet"
        description="Changes to links, categories, users and settings show up here."
      />
    </div>

    <div v-if="data.total > PAGE_SIZE" class="flex items-center justify-center gap-2">
      <UButton
        icon="i-lucide-chevron-left"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="page === 1"
        class="min-h-10"
        @click="page -= 1"
      >
        Newer
      </UButton>

      <span class="text-sm text-muted">
        {{ (page - 1) * PAGE_SIZE + 1 }}–{{ Math.min(page * PAGE_SIZE, data.total) }} of {{ data.total }}
      </span>

      <UButton
        trailing-icon="i-lucide-chevron-right"
        color="neutral"
        variant="outline"
        size="sm"
        :disabled="page * PAGE_SIZE >= data.total"
        class="min-h-10"
        @click="page += 1"
      >
        Older
      </UButton>
    </div>
  </div>
</template>
