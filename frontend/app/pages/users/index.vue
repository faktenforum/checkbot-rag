<script lang="ts" setup>
import type { User } from "@checkbot/core";

const { t } = useI18n();
const { list, deactivate, deleteUser } = useUsers();
const error = ref("");

const { data, refresh, pending } = useAsyncData("users", () => list({ includeInactive: true }));

const columns = [
  { key: "name", label: t("users.name") },
  { key: "email", label: t("users.email") },
  { key: "userType", label: t("users.type") },
  { key: "permissions", label: t("users.permissions") },
  { key: "source", label: t("users.source") },
  { key: "active", label: t("users.active") },
  { key: "actions", label: "" },
];

async function handleDeactivate(user: User) {
  error.value = "";
  try {
    await deactivate(user.id);
    await refresh();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function handleDelete(user: User) {
  error.value = "";
  try {
    await deleteUser(user.id);
    await refresh();
  } catch (err) {
    error.value = (err as Error).message;
  }
}
</script>

<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="text-2xl font-bold">{{ t("users.title") }}</h1>
      <UButton to="/users/new" icon="i-heroicons-plus">{{ t("users.create") }}</UButton>
    </div>

    <UAlert v-if="error" color="error" :description="error" />

    <UTable
      :loading="pending"
      :data="data?.users ?? []"
      :columns="columns"
    >
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
      <template #source-data="{ row }">
        <UBadge v-if="row.source === 'env_bootstrap'" size="xs" color="warning">env</UBadge>
        <span v-else class="text-muted text-xs">{{ t("users.manual") }}</span>
      </template>
      <template #actions-data="{ row }">
        <div class="flex justify-end gap-2">
          <UButton :to="`/users/${row.id}`" size="xs" variant="ghost" icon="i-heroicons-pencil" />
          <UButton
            v-if="row.active && row.source !== 'env_bootstrap'"
            size="xs"
            variant="ghost"
            color="warning"
            icon="i-heroicons-no-symbol"
            @click="handleDeactivate(row)"
          />
          <UButton
            v-if="row.source !== 'env_bootstrap'"
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
