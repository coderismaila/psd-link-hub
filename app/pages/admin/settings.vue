<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { archiveSettingsBodySchema, type ArchiveSettingsBody } from '#shared/schemas/archive'
import { DEFAULT_ARCHIVE_SETTINGS, type ArchiveSettings } from '#shared/types/settings'
import type { LinkWithPrefs } from '#shared/types/link'

definePageMeta({ middleware: 'admin' })
useHead({ title: 'Archive settings — PSD Link Hub' })

const toast = useToast()

const { data: settings, refresh: refreshSettings } = useFetch('/api/admin/settings', {
  key: 'archive-settings',
  default: (): ArchiveSettings => ({ ...DEFAULT_ARCHIVE_SETTINGS })
})

const state = reactive<ArchiveSettingsBody>({
  mode: settings.value.mode,
  graceDays: settings.value.graceDays,
  includeYearly: settings.value.includeYearly
})

watch(settings, (value) => {
  state.mode = value.mode
  state.graceDays = value.graceDays
  state.includeYearly = value.includeYearly
})

const { data: overdue, refresh: refreshOverdue } = useFetch<LinkWithPrefs[]>('/api/admin/archive/overdue', {
  key: 'archive-overdue',
  default: () => []
})

const saving = ref(false)
const running = ref(false)

const modeItems = [
  { label: 'Automatic', value: 'auto', description: 'Monthly links archive themselves once due.' },
  { label: 'Manual', value: 'manual', description: 'Nothing archives until you run it.' }
]

const lastRun = computed(() => settings.value.lastRunAt
  ? new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
      .format(new Date(settings.value.lastRunAt))
  : 'Never')

function reportError(title: string, error: unknown) {
  const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
  toast.add({ title, description: message || 'Please try again.', color: 'error' })
}

async function onSubmit(event: FormSubmitEvent<ArchiveSettingsBody>) {
  saving.value = true

  try {
    await $fetch('/api/admin/settings', { method: 'PUT', body: event.data })
    toast.add({ title: 'Settings saved', icon: 'i-lucide-check', color: 'success' })
    await Promise.all([refreshSettings(), refreshOverdue()])
  } catch (error) {
    reportError('Could not save the settings', error)
  } finally {
    saving.value = false
  }
}

async function runNow() {
  running.value = true

  try {
    const { archived } = await $fetch<{ archived: number }>('/api/admin/archive/run', {
      method: 'POST'
    })

    toast.add({
      title: archived
        ? `Archived ${archived} link${archived === 1 ? '' : 's'}`
        : 'Nothing was due',
      icon: 'i-lucide-check',
      color: 'success'
    })

    await Promise.all([refreshSettings(), refreshOverdue()])
  } catch (error) {
    reportError('Could not run the archive', error)
  } finally {
    running.value = false
  }
}
</script>

<template>
  <div class="flex max-w-2xl flex-col gap-6">
    <UForm
      :schema="archiveSettingsBodySchema"
      :state="state"
      class="flex flex-col gap-4"
      @submit="onSubmit"
    >
      <UFormField
        label="Mode"
        name="mode"
        description="Automatic archiving needs either cron or regular traffic; the app catches up on its own at most once an hour."
      >
        <URadioGroup v-model="state.mode" :items="modeItems" />
      </UFormField>

      <UFormField
        label="Grace days"
        name="graceDays"
        description="Days after a period ends before its links are archived."
      >
        <UInputNumber v-model="state.graceDays" :min="0" :max="31" class="w-32" />
      </UFormField>

      <UFormField label="Include yearly links" name="includeYearly">
        <USwitch
          v-model="state.includeYearly"
          label="Archive yearly links too"
          description="Yearly links fall due the same number of grace days after 31 December."
        />
      </UFormField>

      <div class="flex flex-wrap items-center gap-3">
        <UButton type="submit" :loading="saving" class="min-h-10">
          Save settings
        </UButton>

        <UButton
          color="neutral"
          variant="outline"
          icon="i-lucide-play"
          :loading="running"
          class="min-h-10"
          @click="runNow"
        >
          Run archive now
        </UButton>

        <span class="text-sm text-muted">Last run: {{ lastRun }}</span>
      </div>
    </UForm>

    <section v-if="settings.mode === 'manual'" class="flex flex-col gap-3">
      <div class="flex items-center gap-2">
        <h2 class="font-semibold">
          Overdue for archive
        </h2>
        <UBadge v-if="overdue.length" color="warning" variant="subtle">
          {{ overdue.length }}
        </UBadge>
      </div>

      <p class="text-sm text-muted">
        These links have passed their archive date. In manual mode they stay visible until you
        run the archive.
      </p>

      <div v-if="overdue.length" class="flex flex-col gap-2">
        <div
          v-for="link in overdue"
          :key="link.id"
          class="flex flex-wrap items-center gap-2 rounded-lg border border-default p-3"
        >
          <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ link.name }}</span>
          <CategoryBadge :category="link.category" />
          <PeriodBadge :label="link.periodLabel" :period-type="link.periodType" />
        </div>

        <div>
          <UButton
            color="warning"
            icon="i-lucide-archive"
            :loading="running"
            class="min-h-10"
            @click="runNow"
          >
            Archive {{ overdue.length }} overdue {{ overdue.length === 1 ? 'link' : 'links' }}
          </UButton>
        </div>
      </div>

      <EmptyState
        v-else
        icon="i-lucide-check"
        title="Nothing overdue"
        description="Every active link is still within its period."
      />
    </section>
  </div>
</template>
