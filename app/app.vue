<template>
  <UApp>
    <NuxtRouteAnnouncer />
    <!-- Visible progress while a route's data loads, so a slow page never looks stuck. -->
    <NuxtLoadingIndicator color="var(--ui-primary)" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
