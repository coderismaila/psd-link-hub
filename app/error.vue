<script setup lang="ts">
import type { NuxtError } from '#app'

const props = defineProps<{ error: NuxtError }>()

useHead({ title: `${props.error.statusCode} — PSD Link Hub` })

const notFound = computed(() => props.error.statusCode === 404)
const forbidden = computed(() => props.error.statusCode === 403)
const unauthorized = computed(() => props.error.statusCode === 401)

const heading = computed(() => {
  if (notFound.value) return 'Page not found'
  if (forbidden.value) return 'You do not have access to this'
  if (unauthorized.value) return 'Please sign in again'
  return 'Something went wrong'
})

const body = computed(() => {
  if (notFound.value) return 'The page you were after does not exist, or it has moved.'
  if (forbidden.value) return 'Ask an admin if you think you should be able to see this page.'
  if (unauthorized.value) return 'Your session has ended. Signing in again will pick up where you left off.'
  return 'That is our fault, not yours. Try again in a moment.'
})

const icon = computed(() => {
  if (notFound.value) return 'i-lucide-map-pin-off'
  if (forbidden.value || unauthorized.value) return 'i-lucide-lock'
  return 'i-lucide-triangle-alert'
})

function goHome() {
  // Clears the error before navigating, otherwise the error page stays mounted.
  return clearError({ redirect: unauthorized.value ? '/login' : '/' })
}
</script>

<template>
  <UApp>
    <div class="flex min-h-svh items-center justify-center p-4">
      <UCard class="w-full max-w-md">
        <div class="flex flex-col items-center gap-3 text-center">
          <UIcon :name="icon" class="size-10 text-dimmed" />

          <p class="text-sm font-medium text-dimmed">
            Error {{ error.statusCode }}
          </p>

          <h1 class="text-lg font-semibold">
            {{ heading }}
          </h1>

          <p class="text-sm text-muted">
            {{ body }}
          </p>

          <UButton class="mt-2 min-h-10" icon="i-lucide-arrow-left" @click="goHome">
            {{ unauthorized ? 'Go to sign in' : 'Back to links' }}
          </UButton>
        </div>
      </UCard>
    </div>
  </UApp>
</template>
