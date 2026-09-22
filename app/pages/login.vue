<script setup lang="ts">
import type { FormSubmitEvent } from '@nuxt/ui'
import { loginSchema, type LoginInput } from '#shared/schemas/auth'

definePageMeta({ layout: 'auth' })
useHead({ title: 'Sign in — PSD Link Hub' })

const { fetch: refreshSession } = useUserSession()
const toast = useToast()

const state = reactive<Partial<LoginInput>>({ email: undefined, password: undefined })
const loading = ref(false)

/** Pulls the server's `statusMessage` out of a `$fetch` failure, falling back to a safe default. */
function errorMessage(error: unknown): string {
  const data = (error as { data?: { statusMessage?: string } })?.data
  return data?.statusMessage || 'Something went wrong. Please try again.'
}

async function onSubmit(event: FormSubmitEvent<LoginInput>) {
  loading.value = true

  try {
    await $fetch('/api/auth/login', { method: 'POST', body: event.data })
    await refreshSession()
    await navigateTo('/')
  } catch (error) {
    toast.add({ title: 'Could not sign in', description: errorMessage(error), color: 'error' })
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-semibold tracking-tight">
      Sign in
    </h1>
    <p class="mt-1 mb-6 text-sm text-muted">
      Use the account your administrator created for you.
    </p>

    <UForm :schema="loginSchema" :state="state" class="space-y-4" @submit="onSubmit">
      <UFormField label="Email" name="email">
        <UInput
          v-model="state.email"
          type="email"
          autocomplete="email"
          autofocus
          placeholder="you@example.com"
          class="w-full"
        />
      </UFormField>

      <UFormField label="Password" name="password">
        <UInput
          v-model="state.password"
          type="password"
          autocomplete="current-password"
          class="w-full"
        />
      </UFormField>

      <UButton type="submit" block size="lg" :loading="loading" class="min-h-11">
        Sign in
      </UButton>
    </UForm>

    <p class="mt-6 text-center text-xs text-dimmed">
      Accounts are created by an administrator. There is no self sign-up.
    </p>
  </div>
</template>
