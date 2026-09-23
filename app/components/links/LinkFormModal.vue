<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { isGoogleSheetsUrl, linkBodySchema, type LinkBody, type LinkBodyInput } from '#shared/schemas/link'
import { categoryHex } from '#shared/schemas/category'
import { availableYears } from '#shared/utils/period'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  /** Set when editing; null when creating (including "duplicate for next period"). */
  linkId?: number | null
  initial: LinkBodyInput
  /** Shown read-only while editing, since `createdAt` is never editable. */
  createdAt?: string | null
}>()

const emit = defineEmits<{ saved: [] }>()

const toast = useToast()
const { categories } = useCategories()
const { appTimezone } = useRuntimeConfig().public

const state = reactive<LinkBodyInput>({ ...props.initial })
const loading = ref(false)

// Each time the modal opens it starts from whatever the parent prefilled — a blank link, the one
// being edited, or a copy pushed to the next period.
watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(state, props.initial)
  }
})

const categoryItems = computed(() =>
  categories.value.map(category => ({
    label: category.name,
    value: category.id,
    color: categoryHex(category.color)
  }))
)

const periodTypeItems = [
  { label: 'Monthly', value: 'monthly', description: 'One sheet per month' },
  { label: 'Yearly', value: 'yearly', description: 'One sheet for the whole year' }
]

// Short names keep the twelve buttons on three tidy rows.
const monthItems = Array.from({ length: 12 }, (_, index) => ({
  label: new Intl.DateTimeFormat('en-GB', { month: 'short' }).format(new Date(2000, index, 1)),
  value: index + 1
}))

/**
 * Only the years this app can have links for, plus the one being edited if it somehow sits
 * outside that range.
 */
const yearItems = computed(() =>
  availableYears(new Date(), appTimezone, state.periodYear)
    .map(year => ({ label: String(year), value: year }))
)

/** Non-blocking: most links here are Google Sheets, but anything reachable is allowed. */
const showSheetsWarning = computed(() =>
  Boolean(state.url?.trim()) && !isGoogleSheetsUrl(state.url.trim())
)

const createdOn = computed(() => props.createdAt
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(props.createdAt))
  : null
)

async function onSubmit(event: FormSubmitEvent<LinkBody>) {
  loading.value = true

  try {
    if (props.linkId) {
      await $fetch(`/api/links/${props.linkId}`, { method: 'PATCH', body: event.data })
    } else {
      await $fetch('/api/links', { method: 'POST', body: event.data })
    }

    toast.add({
      title: props.linkId ? 'Link updated' : 'Link created',
      icon: 'i-lucide-check',
      color: 'success'
    })

    open.value = false
    emit('saved')
  } catch (error) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({
      title: 'Could not save the link',
      description: message || 'Please try again.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="linkId ? 'Edit link' : 'New link'"
    :description="linkId ? 'Update the sheet details.' : 'Add a sheet for the team to find.'"
  >
    <template #body>
      <UForm
        id="link-form"
        :schema="linkBodySchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="Dispatch Daily Log" class="w-full" />
        </UFormField>

        <UFormField label="Description" name="description" hint="Optional">
          <UTextarea
            v-model="state.description"
            :rows="2"
            placeholder="What this sheet is for"
            class="w-full"
          />
        </UFormField>

        <UFormField label="URL" name="url" required>
          <UInput
            v-model="state.url"
            type="url"
            placeholder="https://docs.google.com/spreadsheets/..."
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="showSheetsWarning"
          color="warning"
          variant="subtle"
          icon="i-lucide-triangle-alert"
          title="Not a Google Sheets link"
          description="You can still save it — check the address is the one you meant."
        />

        <UFormField label="Category" name="categoryId" required>
          <URadioGroup
            v-model="state.categoryId"
            :items="categoryItems"
            variant="card"
            indicator="hidden"
            orientation="horizontal"
            :ui="{ fieldset: 'grid grid-cols-2 gap-2 sm:grid-cols-3' }"
          >
            <template #label="{ item }">
              <span class="flex min-w-0 items-center gap-1.5">
                <span
                  class="ke-cat-fill size-2 shrink-0 rounded-full"
                  :style="{ '--cat': item.color }"
                />
                <span class="truncate">{{ item.label }}</span>
              </span>
            </template>
          </URadioGroup>
        </UFormField>

        <div class="grid gap-4 sm:grid-cols-3">
          <UFormField label="Period type" name="periodType" required class="sm:col-span-3">
            <URadioGroup
              v-model="state.periodType"
              :items="periodTypeItems"
              variant="card"
              orientation="horizontal"
              :ui="{ fieldset: 'grid grid-cols-2 gap-2' }"
            />
          </UFormField>

          <UFormField
            v-if="state.periodType === 'monthly'"
            label="Month"
            name="periodMonth"
            required
            class="sm:col-span-2"
          >
            <URadioGroup
              :model-value="state.periodMonth ?? undefined"
              :items="monthItems"
              variant="card"
              indicator="hidden"
              orientation="horizontal"
              :ui="{ fieldset: 'grid grid-cols-4 gap-1.5', item: 'justify-center px-2 py-1.5 text-center' }"
              @update:model-value="state.periodMonth = $event as number"
            />
          </UFormField>

          <UFormField label="Year" name="periodYear" required>
            <URadioGroup
              v-model="state.periodYear"
              :items="yearItems"
              variant="table"
              orientation="horizontal"
              indicator="hidden"
              :ui="{ fieldset: 'flex-row', item: 'justify-center text-center' }"
            />
          </UFormField>
        </div>

        <p v-if="createdOn" class="text-sm text-muted">
          Added {{ createdOn }}
        </p>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="loading" @click="open = false">
          Cancel
        </UButton>

        <UButton type="submit" form="link-form" :loading="loading">
          {{ linkId ? 'Save changes' : 'Create link' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
