<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { CATEGORY_COLORS, categoryBodySchema, type CategoryBody } from '#shared/schemas/category'

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  /** Set when renaming or recolouring; null when creating. */
  categoryId?: number | null
  initial: CategoryBody
}>()

const emit = defineEmits<{ saved: [] }>()

const toast = useToast()

const state = reactive<CategoryBody>({ ...props.initial })
const loading = ref(false)

watch(open, (isOpen) => {
  if (isOpen) {
    Object.assign(state, props.initial)
  }
})

const colorItems = CATEGORY_COLORS.map(color => ({
  label: color.charAt(0).toUpperCase() + color.slice(1),
  value: color
}))

async function onSubmit(event: FormSubmitEvent<CategoryBody>) {
  loading.value = true

  try {
    if (props.categoryId) {
      await $fetch(`/api/categories/${props.categoryId}`, { method: 'PATCH', body: event.data })
    } else {
      await $fetch('/api/categories', { method: 'POST', body: event.data })
    }

    toast.add({
      title: props.categoryId ? 'Category updated' : 'Category created',
      icon: 'i-lucide-check',
      color: 'success'
    })

    open.value = false
    emit('saved')
  } catch (error) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({
      title: 'Could not save the category',
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
    :title="categoryId ? 'Edit category' : 'New category'"
  >
    <template #body>
      <UForm
        id="category-form"
        :schema="categoryBodySchema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name" required>
          <UInput v-model="state.name" placeholder="Monthly Reports" class="w-full" />
        </UFormField>

        <UFormField label="Colour" name="color" required>
          <USelectMenu
            :model-value="colorItems.find(item => item.value === state.color)"
            :items="colorItems"
            class="w-full"
            @update:model-value="state.color = $event?.value"
          />
        </UFormField>

        <div class="flex items-center gap-2">
          <span class="text-sm text-muted">Preview</span>
          <CategoryBadge :category="{ id: 0, name: state.name || 'Category', color: state.color }" />
        </div>
      </UForm>
    </template>

    <template #footer>
      <div class="flex w-full justify-end gap-2">
        <UButton color="neutral" variant="ghost" :disabled="loading" @click="open = false">
          Cancel
        </UButton>

        <UButton type="submit" form="category-form" :loading="loading">
          {{ categoryId ? 'Save changes' : 'Create category' }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>
