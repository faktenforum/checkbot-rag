<script lang="ts" setup>
import type { ColumnDef } from "@tanstack/vue-table";
import type { ApiKey } from "@search/core";

const props = defineProps<{ userId?: string }>();
const { t } = useI18n();
const { list, revoke, deleteKey } = useApiKeys();
const error = ref("");

const { data, refresh, pending } = useAsyncData(
  `api-keys-${props.userId ?? "all"}`,
  () => list({ userId: props.userId, includeInactive: true })
);

async function handleRevoke(key: ApiKey) {
  error.value = "";
  try {
    await revoke(key.id);
    await refresh();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function handleDelete(key: ApiKey) {
  error.value = "";
  try {
    await deleteKey(key.id);
    await refresh();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

const columns = computed<ColumnDef<ApiKey>[]>(() => [
  { accessorKey: "name", header: t("apiKeys.name") },
  { accessorKey: "keyPrefix", header: t("apiKeys.prefix"), enableSorting: false },
  { accessorKey: "permissions", header: t("users.permissions"), enableSorting: false },
  { accessorKey: "active", header: t("users.active"), enableSorting: false },
  { id: "actions", header: "" },
]);
</script>

<template>
  <div>
    <UAlert v-if="error" color="error" :description="error" class="mb-3" />
    <UTable :loading="pending" :data="data?.keys ?? []" :columns="columns">
      <template #permissions-cell="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge v-for="p in row.original.permissions" :key="p" size="xs" color="neutral">{{ p }}</UBadge>
        </div>
      </template>
      <template #active-cell="{ row }">
        <UBadge :color="row.original.active ? 'success' : 'neutral'" size="xs">
          {{ row.original.active ? t("common.active") : t("common.inactive") }}
        </UBadge>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UButton :to="`/keys/${row.original.id}`" size="xs" variant="ghost" icon="i-heroicons-pencil" />
          <UButton
            v-if="row.original.active"
            size="xs"
            variant="ghost"
            color="warning"
            icon="i-heroicons-no-symbol"
            @click="handleRevoke(row.original)"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            @click="handleDelete(row.original)"
          />
        </div>
      </template>
    </UTable>
  </div>
</template>
