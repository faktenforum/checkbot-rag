<script setup lang="ts">
const { t } = useI18n();
const { data: stats } = useStats();

const statCards = computed(() => [
  { label: t("stats.claims"), value: stats.value?.claims.total ?? t("common.na") },
  { label: t("stats.chunks"), value: stats.value?.chunks.total ?? t("common.na") },
  { label: t("stats.embedded"), value: stats.value?.chunks.embedded ?? t("common.na") },
  {
    label: t("stats.embeddingRate"),
    value:
      stats.value && stats.value.chunks.total > 0
        ? `${Math.round((stats.value.chunks.embedded / stats.value.chunks.total) * 100)}%`
        : t("common.na"),
  },
]);
</script>

<template>
  <div class="space-y-8">
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard v-for="stat in statCards" :key="stat.label">
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">{{ stat.value }}</p>
          <p class="text-sm text-neutral-500 mt-1">{{ stat.label }}</p>
        </div>
      </UCard>
    </div>
  </div>
</template>
