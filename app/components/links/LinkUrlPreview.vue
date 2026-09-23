<script setup lang="ts">
import { describeLinkUrl, shortenId } from '#shared/utils/link-preview'

const props = defineProps<{ url: string }>()

const preview = computed(() => describeLinkUrl(props.url))
</script>

<template>
  <div v-if="preview.valid" class="flex flex-col gap-2">
    <div class="flex items-center gap-3 rounded-md border border-default bg-elevated/40 p-3">
      <span
        class="flex size-9 shrink-0 items-center justify-center rounded-md"
        :class="preview.kind === 'other' ? 'bg-accented text-muted' : 'bg-primary/10 text-primary'"
      >
        <UIcon :name="preview.icon" class="size-5" />
      </span>

      <div class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-sm font-medium">{{ preview.label }}</span>

        <span class="truncate text-xs text-muted">
          {{ preview.host }}
          <template v-if="preview.documentId">
            · {{ shortenId(preview.documentId) }}
          </template>
          <template v-if="preview.tabId">
            · tab {{ preview.tabId }}
          </template>
        </span>
      </div>

      <!--
        The only way to be sure this is the right sheet. The app cannot read the document itself:
        these are private to the organisation, so a request from the server gets Google's sign-in
        page rather than a title.
      -->
      <UButton
        :to="url"
        target="_blank"
        rel="noopener"
        external
        icon="i-lucide-external-link"
        color="neutral"
        variant="outline"
        size="sm"
        class="shrink-0"
      >
        Check
      </UButton>
    </div>

    <p v-if="!preview.secure" class="flex items-center gap-1.5 text-xs text-error">
      <UIcon name="i-lucide-shield-alert" class="size-4 shrink-0" />
      This address is not https, so it will be rejected when you save.
    </p>

    <p v-else-if="preview.kind === 'other'" class="flex items-center gap-1.5 text-xs text-warning">
      <UIcon name="i-lucide-triangle-alert" class="size-4 shrink-0" />
      Not a Google Workspace link. You can still save it — check the address is the one you meant.
    </p>
  </div>
</template>
