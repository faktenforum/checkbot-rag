<script lang="ts" setup>
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { list } = useAuditLog();

const filter = reactive({
  action: "",
  userId: "",
  from: "",
  to: "",
  offset: 0,
  limit: 50,
});

const { data, pending, refresh } = useAsyncData(
  "audit-log",
  () => list({
    action: filter.action || undefined,
    userId: filter.userId || undefined,
    from: filter.from || undefined,
    to: filter.to || undefined,
    offset: filter.offset,
    limit: filter.limit,
  }),
  { watch: [filter] }
);

const columns = [
  { key: "createdAt", label: "Time" },
  { key: "action", label: "Action" },
  { key: "userId", label: "User" },
  { key: "targetType", label: "Target" },
  { key: "targetId", label: "Target ID" },
];

function formatDate(iso: string) {
  return new Date(iso).toLocaleString();
}
</script>

<template>
  <div class="space-y-6">
    <h1 class="text-2xl font-bold">{{ t("nav.audit") }}</h1>

    <div class="flex flex-wrap gap-3">
      <UInput v-model="filter.action" :placeholder="t('audit.filterAction')" class="w-48" @change="filter.offset = 0" />
      <UInput v-model="filter.userId" :placeholder="t('audit.filterUser')" class="w-64" @change="filter.offset = 0" />
      <UInput v-model="filter.from" type="datetime-local" class="w-48" @change="filter.offset = 0" />
      <UInput v-model="filter.to" type="datetime-local" class="w-48" @change="filter.offset = 0" />
      <UButton variant="ghost" icon="i-heroicons-arrow-path" @click="refresh">{{ t("import.refresh") }}</UButton>
    </div>

    <UTable :loading="pending" :data="data?.entries ?? []" :columns="columns">
      <template #createdAt-data="{ row }">
        <span class="text-xs font-mono">{{ formatDate(row.createdAt) }}</span>
      </template>
      <template #action-data="{ row }">
        <UBadge size="xs" color="neutral">{{ row.action }}</UBadge>
      </template>
      <template #targetId-data="{ row }">
        <span class="text-xs font-mono text-muted">{{ row.targetId ?? "—" }}</span>
      </template>
    </UTable>

    <div class="flex items-center gap-3 text-sm text-muted" v-if="data">
      <span>{{ data.total }} total</span>
      <UButton
        v-if="filter.offset > 0"
        size="xs"
        variant="ghost"
        @click="filter.offset = Math.max(0, filter.offset - filter.limit)"
      >Prev</UButton>
      <UButton
        v-if="data.entries.length === filter.limit"
        size="xs"
        variant="ghost"
        @click="filter.offset += filter.limit"
      >Next</UButton>
    </div>
  </div>
</template>
