<script setup lang="ts">
import type { DropdownMenuItem, NavigationMenuItem } from '@nuxt/ui'

const { user, clear } = useUserSession()
const colorMode = useColorMode()
const route = useRoute()

const isAdmin = computed(() => user.value?.role === 'admin')

const mainNav: NavigationMenuItem[] = [
  { label: 'Links', icon: 'i-lucide-link', to: '/' },
  { label: 'Archive', icon: 'i-lucide-archive', to: '/archive' }
]

const adminNav: NavigationMenuItem[] = [
  { label: 'Manage links', icon: 'i-lucide-table', to: '/admin/links' },
  { label: 'Categories', icon: 'i-lucide-tags', to: '/admin/categories' },
  { label: 'Users', icon: 'i-lucide-users', to: '/admin/users' },
  { label: 'Settings', icon: 'i-lucide-settings', to: '/admin/settings' }
]

const title = computed(() => {
  const items = isAdmin.value ? [...mainNav, ...adminNav] : mainNav
  return items.find(item => item.to === route.path)?.label ?? 'PSD Link Hub'
})

async function logout() {
  await clear()
  await navigateTo('/login')
}

const userMenuItems = computed<DropdownMenuItem[][]>(() => [
  [{ label: user.value?.email ?? '', type: 'label' }],
  [{
    // A static label keeps the server and client markup identical — the active colour mode is
    // only known in the browser.
    label: 'Toggle theme',
    icon: 'i-lucide-sun-moon',
    onSelect: () => {
      colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark'
    }
  }],
  [{ label: 'Log out', icon: 'i-lucide-log-out', onSelect: logout }]
])
</script>

<template>
  <UDashboardGroup>
    <UDashboardSidebar collapsible resizable :ui="{ footer: 'border-t border-default' }">
      <template #header="{ collapsed }">
        <span v-if="!collapsed" class="truncate font-semibold">PSD Link Hub</span>
        <UIcon v-else name="i-lucide-link" class="mx-auto size-5 text-primary" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu :collapsed="collapsed" :items="mainNav" orientation="vertical" />

        <template v-if="isAdmin">
          <p v-if="!collapsed" class="mt-4 px-2.5 text-xs font-semibold text-dimmed uppercase">
            Admin
          </p>
          <UNavigationMenu
            :collapsed="collapsed"
            :items="adminNav"
            orientation="vertical"
            :class="collapsed ? 'mt-4' : undefined"
          />
        </template>
      </template>

      <template #footer="{ collapsed }">
        <UDropdownMenu :items="userMenuItems" :class="collapsed ? undefined : 'w-full'">
          <UButton
            color="neutral"
            variant="ghost"
            icon="i-lucide-circle-user"
            :label="collapsed ? undefined : user?.name"
            :block="!collapsed"
            :square="collapsed"
            :ui="{ base: collapsed ? undefined : 'justify-start' }"
            :aria-label="`Account menu for ${user?.name}`"
          />
        </UDropdownMenu>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel>
      <template #header>
        <UDashboardNavbar :title="title">
          <template #leading>
            <UDashboardSidebarCollapse />
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <slot />
      </template>
    </UDashboardPanel>
  </UDashboardGroup>
</template>
