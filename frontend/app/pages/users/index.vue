<script lang="ts" setup>
import type { ColumnDef } from "@tanstack/vue-table";
import type { User } from "@search/core";

const { t } = useI18n();
const { list, deactivate, deleteUser } = useUsers();
const error = ref("");

const { data, refresh, pending } = useAsyncData("users", () => list({ includeInactive: true }));

const columns = computed<ColumnDef<User>[]>(() => [
  { accessorKey: "name", header: t("users.name") },
  { accessorKey: "email", header: t("users.email") },
  { accessorKey: "userType", header: t("users.type") },
  { accessorKey: "permissions", header: t("users.permissions"), enableSorting: false },
  { accessorKey: "source", header: t("users.source"), enableSorting: false },
  { accessorKey: "active", header: t("users.active"), enableSorting: false },
  { id: "actions", header: "" },
]);

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
      <template #source-cell="{ row }">
        <UBadge v-if="row.original.source === 'env_bootstrap'" size="xs" color="warning">env</UBadge>
        <span v-else class="text-muted text-xs">{{ t("users.manual") }}</span>
      </template>
      <template #actions-cell="{ row }">
        <div class="flex justify-end gap-2">
          <UButton :to="`/users/${row.original.id}`" size="xs" variant="ghost" icon="i-heroicons-pencil" />
          <UButton
            v-if="row.original.active && row.original.source !== 'env_bootstrap'"
            size="xs"
            variant="ghost"
            color="warning"
            icon="i-heroicons-no-symbol"
            @click="handleDeactivate(row.original)"
          />
          <UButton
            v-if="row.original.source !== 'env_bootstrap'"
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
