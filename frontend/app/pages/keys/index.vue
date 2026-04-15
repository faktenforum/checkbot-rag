<script lang="ts" setup>
const { t } = useI18n();

</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t("nav.apiKeys") }}</h1>
      <UButton to="/keys/new" icon="i-heroicons-plus">{{ t("apiKeys.create") }}</UButton>
    </div>

    <ApiKeyList />
  </div>
</template>
