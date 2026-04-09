<script lang="ts" setup>
const props = defineProps<{ rawKey: string }>();
const { t } = useI18n();
const copied = ref(false);

async function copy() {
  await navigator.clipboard.writeText(props.rawKey);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}
</script>

<template>
  <UAlert
    color="success"
    icon="i-heroicons-key"
    :title="t('apiKeys.createdTitle')"
    :description="t('apiKeys.createdDesc')"
  >
    <template #description>
      <p class="mb-2 text-sm">{{ t("apiKeys.createdDesc") }}</p>
      <div class="flex items-center gap-2">
        <code class="flex-1 rounded bg-elevated px-3 py-2 text-sm font-mono break-all">
          {{ rawKey }}
        </code>
        <UButton
          :icon="copied ? 'i-heroicons-check' : 'i-heroicons-clipboard'"
          variant="ghost"
          size="sm"
          :color="copied ? 'success' : 'neutral'"
          @click="copy"
        />
      </div>
    </template>
  </UAlert>
</template>
