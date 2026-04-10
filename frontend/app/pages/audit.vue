<script lang="ts" setup>
import type { ColumnDef } from "@tanstack/vue-table";


const { t } = useI18n();
const { list } = useAuditLog();

interface AuditEntry {
  id: number;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  createdAt: string;
}

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

const columns = computed<ColumnDef<AuditEntry>[]>(() => [
  { accessorKey: "createdAt", header: "Time", enableSorting: false },
  { accessorKey: "action", header: "Action", enableSorting: false },
  { accessorKey: "userId", header: "User", enableSorting: false },
  { accessorKey: "targetType", header: "Target", enableSorting: false },
  { accessorKey: "targetId", header: "Target ID", enableSorting: false },
]);

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
      <template #createdAt-cell="{ row }">
        <span class="text-xs font-mono">{{ formatDate(row.original.createdAt) }}</span>
      </template>
      <template #action-cell="{ row }">
        <UBadge size="xs" color="neutral">{{ row.original.action }}</UBadge>
      </template>
      <template #targetId-cell="{ row }">
        <span class="text-xs font-mono text-muted">{{ row.original.targetId ?? "—" }}</span>
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
