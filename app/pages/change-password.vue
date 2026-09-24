<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { changePasswordSchema, type ChangePasswordBody } from '#shared/schemas/user'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Change password — PSD Link Hub' })

const { user, fetch: refreshSession, clear } = useUserSession()
const toast = useToast()

/** Forced when the account still holds a password an admin set; otherwise this is voluntary. */
const required = computed(() => Boolean(user.value?.mustChangePassword))

const state = reactive<ChangePasswordBody>({ currentPassword: '', newPassword: '' })
const loading = ref(false)

async function onSubmit(event: FormSubmitEvent<ChangePasswordBody>) {
  loading.value = true

  try {
    await $fetch('/api/me/password', { method: 'PATCH', body: event.data })
    // The session still says a change is outstanding until it is refetched.
    await refreshSession()

    toast.add({ title: 'Password changed', icon: 'i-lucide-check', color: 'success' })
    await navigateTo('/')
  } catch (error) {
    const message = (error as { data?: { statusMessage?: string } })?.data?.statusMessage
    toast.add({
      title: 'Could not change the password',
      description: message || 'Please try again.',
      color: 'error'
    })
  } finally {
    loading.value = false
  }
}

async function logout() {
  await clear()
  await navigateTo('/login')
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">
      {{ required ? 'Choose your own password' : 'Change password' }}
    </h1>

    <p class="mt-1 mb-6 text-sm text-muted">
      <template v-if="required">
        Your account is still using the password an administrator gave you. Set one only you know
        before carrying on.
      </template>
      <template v-else>
        You will stay signed in on this device.
      </template>
    </p>

    <UForm
      :schema="changePasswordSchema"
      :state="state"
      class="space-y-4"
      @submit="onSubmit"
    >
      <UFormField
        :label="required ? 'The password you were given' : 'Current password'"
        name="currentPassword"
        required
      >
        <UInput
          v-model="state.currentPassword"
          type="password"
          autocomplete="current-password"
          autofocus
          class="w-full"
        />
      </UFormField>

      <UFormField
        label="New password"
        name="newPassword"
        required
        description="At least 8 characters."
      >
        <UInput
          v-model="state.newPassword"
          type="password"
          autocomplete="new-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading" class="min-h-11">
        {{ required ? 'Set my password' : 'Change password' }}
      </UButton>
    </UForm>

    <div class="mt-6 text-center text-sm">
      <!-- Forced users have nowhere to go but out; everyone else just came from the app. -->
      <UButton
        v-if="required"
        color="neutral"
        variant="link"
        icon="i-lucide-log-out"
        @click="logout"
      >
        Sign out instead
      </UButton>
      <UButton v-else to="/" color="neutral" variant="link" icon="i-lucide-arrow-left">
        Back to links
      </UButton>
    </div>
  </div>
</template>
