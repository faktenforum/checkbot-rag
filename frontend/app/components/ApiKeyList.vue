<script lang="ts" setup>
import type { ApiKey } from "@checkbot/core";

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

const columns = [
  { key: "name", label: t("apiKeys.name") },
  { key: "keyPrefix", label: t("apiKeys.prefix") },
  { key: "permissions", label: t("users.permissions") },
  { key: "active", label: t("users.active") },
  { key: "actions", label: "" },
];
</script>

<template>
  <div>
    <UAlert v-if="error" color="error" :description="error" class="mb-3" />
    <UTable :loading="pending" :data="data?.keys ?? []" :columns="columns">
      <template #permissions-data="{ row }">
        <div class="flex flex-wrap gap-1">
          <UBadge v-for="p in row.permissions" :key="p" size="xs" color="neutral">{{ p }}</UBadge>
        </div>
      </template>
      <template #active-data="{ row }">
        <UBadge :color="row.active ? 'success' : 'neutral'" size="xs">
          {{ row.active ? t("common.active") : t("common.inactive") }}
        </UBadge>
      </template>
      <template #actions-data="{ row }">
        <div class="flex justify-end gap-2">
          <UButton :to="`/api-keys/${row.id}`" size="xs" variant="ghost" icon="i-heroicons-pencil" />
          <UButton
            v-if="row.active"
            size="xs"
            variant="ghost"
            color="warning"
            icon="i-heroicons-no-symbol"
            @click="handleRevoke(row)"
          />
          <UButton
            size="xs"
            variant="ghost"
            color="error"
            icon="i-heroicons-trash"
            @click="handleDelete(row)"
          />
        </div>
      </template>
    </UTable>
  </div>
</template>
