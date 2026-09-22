<script setup lang="ts">
import type { ButtonProps } from '@nuxt/ui'

const open = defineModel<boolean>('open', { required: true })

withDefaults(defineProps<{
  title: string
  description?: string
  confirmLabel?: string
  color?: ButtonProps['color']
  loading?: boolean
}>(), {
  description: undefined,
  confirmLabel: 'Confirm',
  color: 'error',
  loading: false
})

const emit = defineEmits<{ confirm: [] }>()
</script>

<template>
  <UModal v-model:open="open" :title="title" :description="description">
    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="loading" @click="open = false">
          Cancel
        </UButton>

        <UButton :color="color" :loading="loading" @click="emit('confirm')">
          {{ confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
