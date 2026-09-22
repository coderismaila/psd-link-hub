<script setup lang="ts">
useHead({ title: 'PSD Link Hub' })

const { user } = useUserSession()
</script>

<template>
  <UCard>
    <template #header>
      <h1 class="text-lg font-semibold">
        Signed in as {{ user?.name }}
      </h1>
    </template>

    <div class="space-y-2 text-sm">
      <p class="text-muted">
        {{ user?.email }}
      </p>
      <UBadge :color="user?.role === 'admin' ? 'primary' : 'neutral'" variant="subtle">
        {{ user?.role }}
      </UBadge>
    </div>

    <template #footer>
      <p class="text-sm text-muted">
        Links, favorites and the archive land in the next phases.
      </p>
    </template>
  </UCard>
</template>
