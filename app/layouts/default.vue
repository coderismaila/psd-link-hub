<script setup lang="ts">
import type { DropdownMenuItem } from '@nuxt/ui'

// Placeholder shell until Phase 3 replaces it with the UDashboard layout and its sidebar nav.
const { user, clear } = useUserSession()

async function logout() {
  await clear()
  await navigateTo('/login')
}

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.email ?? '', type: 'label' }],
  [{ label: 'Log out', icon: 'i-lucide-log-out', onSelect: logout }]
])
</script>

<template>
  <div class="min-h-svh">
    <header class="border-b border-default">
      <div class="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <NuxtLink to="/" class="font-semibold">
          PSD Link Hub
        </NuxtLink>

        <UDropdownMenu :items="userMenuItems">
          <UButton
            color="neutral"
            variant="ghost"
            trailing-icon="i-lucide-chevron-down"
            :label="user?.name"
            :aria-label="`Account menu for ${user?.name}`"
          />
        </UDropdownMenu>
      </div>
    </header>

    <main class="mx-auto max-w-5xl px-4 py-6">
      <slot />
    </main>
  </div>
</template>
