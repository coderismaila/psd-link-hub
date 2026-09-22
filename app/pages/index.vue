<script setup lang="ts">
useHead({ title: 'PSD Link Hub' })
</script>

<template>
  <div class="flex min-h-svh items-center justify-center p-6">
    <UCard class="w-full max-w-md">
      <template #header>
        <h1 class="text-lg font-semibold">
          PSD Link Hub
        </h1>
      </template>
      <p class="text-sm text-muted">
        Scaffold is up. Links, favorites and the archive land in the next phases.
      </p>
      <template #footer>
        <UButton to="https://nuxt.com/docs" target="_blank" icon="i-lucide-book-open" variant="subtle">
          Nuxt docs
        </UButton>
      </template>
    </UCard>
  </div>
</template>
