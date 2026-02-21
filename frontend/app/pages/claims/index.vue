<template>
  <div class="space-y-6">
    <div class="flex items-center justify-between">
      <h1 class="h1">Faktenchecks</h1>
      <UButton to="/import" variant="soft" icon="i-heroicons-arrow-up-tray" size="sm">
        Importieren
      </UButton>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap gap-3">
      <USelect
        v-model="selectedStatus"
        :items="statusOptions"
        placeholder="Status"
        size="sm"
        class="w-40"
      />
      <USelect
        v-model="selectedRating"
        :items="ratingOptions"
        placeholder="Urteil"
        size="sm"
        class="w-44"
      />
      <USelect
        v-model="selectedCategory"
        :items="categoryOptions"
        placeholder="Kategorie"
        size="sm"
        class="w-44"
      />
    </div>

    <!-- Loading state -->
    <div v-if="isPending" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto animate-spin text-neutral-400" />
    </div>

    <!-- Error state -->
    <UAlert v-else-if="error" color="error" :description="error.message" />

    <!-- Claims table -->
    <UCard v-else-if="data">
      <UTable :data="data.data" :columns="columns">
        <template #synopsis-cell="{ row }">
          <p class="max-w-md truncate">{{ row.original.synopsis ?? "—" }}</p>
        </template>
        <template #rating_label-cell="{ row }">
          <RatingBadge :label="row.original.rating_label" />
        </template>
        <template #categories-cell="{ row }">
          <div class="flex flex-wrap gap-1">
            <UBadge
              v-for="cat in row.original.categories"
              :key="cat"
              color="neutral"
              variant="soft"
              size="xs"
            >
              {{ cat }}
            </UBadge>
          </div>
        </template>
        <template #publishing_date-cell="{ row }">
          {{
            row.original.publishing_date
              ? new Date(row.original.publishing_date).toLocaleDateString("de-DE")
              : "—"
          }}
        </template>
        <template #actions-cell="{ row }">
          <UButton
            :to="`/claims/${row.original.short_id}`"
            variant="ghost"
            size="xs"
            icon="i-heroicons-eye"
          />
        </template>
      </UTable>

      <!-- Pagination -->
      <div v-if="data.pages > 1" class="mt-4 flex justify-center">
        <UPagination
          v-model:page="page"
          :total="data.total"
          :page-count="data.limit"
        />
      </div>
      <p class="text-xs text-neutral-400 mt-2 text-center">
        {{ data.total }} Faktenchecks insgesamt
      </p>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import type { ColumnDef } from "@tanstack/vue-table";
import type { ClaimListItem, ClaimListResponse, StatsResponse } from "../../types/api";

const { apiFetch } = useApi();

const { data: stats } = useQuery({
  queryKey: ["stats"],
  queryFn: () => apiFetch<StatsResponse>("/api/v1/stats"),
});

/** Sentinel value for "no filter" – must not be empty string (USelect reserves "" for placeholder). */
const ALL_FILTER = "__all__";

const page = ref(1);
const selectedStatus = ref<string>(ALL_FILTER);
const selectedRating = ref<string>(ALL_FILTER);
const selectedCategory = ref<string>(ALL_FILTER);

// Reset to first page when filters change
watch([selectedStatus, selectedRating, selectedCategory], () => {
  page.value = 1;
});

const { data, isPending, error } = useQuery<ClaimListResponse>({
  queryKey: computed(() => [
    "claims",
    page.value,
    selectedStatus.value,
    selectedRating.value,
    selectedCategory.value,
  ]),
  queryFn: () => {
    const params = new URLSearchParams({
      page: String(page.value),
      limit: "20",
    });
    if (selectedStatus.value && selectedStatus.value !== ALL_FILTER) params.set("status", selectedStatus.value);
    if (selectedRating.value && selectedRating.value !== ALL_FILTER) params.set("ratingLabel", selectedRating.value);
    if (selectedCategory.value && selectedCategory.value !== ALL_FILTER) params.set("category", selectedCategory.value);
    return apiFetch<ClaimListResponse>(`/api/v1/claims?${params}`);
  },
});

const statusOptions = [
  { label: "Alle Status", value: ALL_FILTER },
  { label: "Eingereicht", value: "submitted" },
  { label: "Geprüft", value: "checked" },
  { label: "Veröffentlicht", value: "published" },
  { label: "Importiert", value: "imported" },
];

const ratingOptions = computed(() => {
  const labels = stats.value?.ratingLabels?.map((r) => ({
    label: `${r.rating_label} (${r.count})`,
    value: r.rating_label,
  })) ?? [];
  return [{ label: "Alle Urteile", value: ALL_FILTER }, ...labels];
});

const categoryOptions = computed(() => {
  const cats = stats.value?.categories?.map((c) => ({
    label: `${c.category} (${c.count})`,
    value: c.category,
  })) ?? [];
  return [{ label: "Alle Kategorien", value: ALL_FILTER }, ...cats];
});

const columns: ColumnDef<ClaimListItem>[] = [
  { accessorKey: "short_id", header: "ID", enableSorting: false },
  { accessorKey: "synopsis", header: "Behauptung" },
  { accessorKey: "rating_label", header: "Urteil", enableSorting: false },
  { accessorKey: "categories", header: "Kategorien", enableSorting: false },
  { accessorKey: "publishing_date", header: "Datum" },
  { id: "actions", header: "" },
];
</script>
