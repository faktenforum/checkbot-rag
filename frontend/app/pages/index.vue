<template>
  <div class="space-y-8">
    <!-- Stats overview at the top -->
    <div v-if="stats" class="grid grid-cols-2 sm:grid-cols-4 gap-4">
      <UCard v-for="stat in statCards" :key="stat.label">
        <div class="text-center">
          <p class="text-2xl font-bold text-primary-600">{{ stat.value }}</p>
          <p class="text-sm text-neutral-500 mt-1">{{ stat.label }}</p>
        </div>
      </UCard>
    </div>

    <!-- Search form -->
    <UCard>
      <template #header>
        <h1 class="text-lg font-semibold flex items-center gap-2">
          <UIcon name="i-heroicons-magnifying-glass" class="w-5 h-5" />
          Faktencheck-Suche
        </h1>
      </template>

      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput
            v-model="query"
            placeholder="Suche nach Faktenchecks..."
            class="flex-1"
            size="lg"
            :loading="pending"
            @keyup.enter="doSearch"
          />
          <UButton size="lg" :loading="pending" icon="i-heroicons-magnifying-glass" @click="doSearch">
            Suchen
          </UButton>
        </div>

        <!-- Filters row -->
        <div class="flex flex-wrap gap-3 items-center">
          <USelect
            v-model="selectedRating"
            :items="ratingOptions"
            placeholder="Urteil"
            size="sm"
            class="w-40"
          />
          <USelect
            v-model="selectedCategory"
            :items="categoryOptions"
            placeholder="Kategorie"
            size="sm"
            class="w-44"
          />
          <USelect
            v-model="limit"
            :items="limitOptions"
            size="sm"
            class="w-40"
          />
          <USelect
            v-model="language"
            :items="languageOptions"
            placeholder="Sprache"
            size="sm"
            class="w-40"
          />
        </div>
      </div>
    </UCard>

    <!-- Error state -->
    <UAlert v-if="error" color="error" :description="error" icon="i-heroicons-exclamation-circle" />

    <!-- Results -->
    <div v-if="results" class="space-y-4">
      <div class="flex items-center justify-between">
        <p class="text-sm text-neutral-500">
          {{ results.totalResults }} Ergebnis{{ results.totalResults !== 1 ? "se" : "" }}
          für „{{ results.query }}"
        </p>
      </div>

      <div v-if="results.claims.length === 0" class="text-center py-12 text-neutral-400">
        <UIcon name="i-heroicons-face-frown" class="w-12 h-12 mx-auto mb-3" />
        <p>Keine Faktenchecks gefunden</p>
      </div>

      <UCard
        v-for="claim in results.claims"
        :key="claim.externalId"
        class="hover:shadow-md transition-shadow"
      >
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-4">
            <div class="flex-1">
              <p class="font-medium text-base leading-snug">{{ claim.synopsis }}</p>
              <p class="text-xs text-neutral-400 mt-1">
                {{ claim.shortId }}
                <span v-if="claim.language">
                  • Sprache: {{ claim.language }}
                </span>
              </p>
            </div>
            <RatingBadge :label="claim.ratingLabel" />
          </div>

          <p v-if="claim.ratingSummary" class="text-sm text-neutral-600 dark:text-neutral-400 line-clamp-3">
            {{ claim.ratingSummary }}
          </p>

          <!-- Best matching fact chunk -->
          <div
            v-if="bestFactChunk(claim)"
            class="bg-neutral-50 dark:bg-neutral-800 rounded p-3 text-sm text-neutral-700 dark:text-neutral-300 border-l-2 border-primary-400"
          >
            <p class="text-xs text-neutral-400 mb-1">Relevanter Ausschnitt</p>
            <p class="line-clamp-4">{{ bestFactChunk(claim)!.content }}</p>
          </div>

          <div class="flex items-center justify-between">
            <div class="flex flex-wrap gap-1">
              <UBadge
                v-for="cat in claim.categories"
                :key="cat"
                color="neutral"
                variant="soft"
                size="xs"
              >
                {{ cat }}
              </UBadge>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs text-neutral-400">
                Score: {{ claim.bestScore.toFixed(4) }}
              </span>
              <UButton
                v-if="claim.publishingUrl"
                :to="claim.publishingUrl"
                target="_blank"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                Quelle
              </UButton>
              <UButton
                :to="`/claims/${claim.shortId}`"
                variant="soft"
                size="xs"
                icon="i-heroicons-eye"
              >
                Details
              </UButton>
            </div>
          </div>
        </div>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { SearchResultClaim } from "../types/api";

/** Sentinel for "no filter" – must not be empty string (USelect reserves "" for placeholder). */
const ALL_FILTER = "__all__";

const { results, pending, error, language, search } = useSearch();
const { data: stats } = useStats();

const query = ref("");
const selectedRating = ref<string>(ALL_FILTER);
const selectedCategory = ref<string>(ALL_FILTER);
const limit = ref(10);

const ratingOptions = computed(() => [
  { label: "Alle Urteile", value: ALL_FILTER },
  ...(stats.value?.ratingLabels.map((r) => ({
    label: `${r.rating_label} (${r.count})`,
    value: r.rating_label,
  })) ?? []),
]);

const categoryOptions = computed(() => [
  { label: "Alle Kategorien", value: ALL_FILTER },
  ...(stats.value?.categories.map((c) => ({
    label: `${c.category} (${c.count})`,
    value: c.category,
  })) ?? []),
]);

const limitOptions = [
  { label: "5 Ergebnisse", value: 5 },
  { label: "10 Ergebnisse", value: 10 },
  { label: "20 Ergebnisse", value: 20 },
];

const languageOptions = [
  { label: "Auto (später)", value: "auto" },
  { label: "Deutsch", value: "de" },
  { label: "Englisch", value: "en" },
  { label: "Französisch", value: "fr" },
  { label: "Spanisch", value: "es" },
  { label: "Italienisch", value: "it" },
  { label: "Portugiesisch", value: "pt" },
];

const statCards = computed(() => [
  { label: "Faktenchecks", value: stats.value?.claims.total ?? "—" },
  { label: "Chunks", value: stats.value?.chunks.total ?? "—" },
  { label: "Eingebettet", value: stats.value?.chunks.embedded ?? "—" },
  {
    label: "Einbettungsrate",
    value:
      stats.value && stats.value.chunks.total > 0
        ? `${Math.round((stats.value.chunks.embedded / stats.value.chunks.total) * 100)}%`
        : "—",
  },
]);

function bestFactChunk(claim: SearchResultClaim) {
  return claim.chunks
    .filter((c) => c.chunkType === "fact_detail")
    .sort((a, b) => b.rrfScore - a.rrfScore)[0];
}

async function doSearch() {
  await search({
    query: query.value,
    limit: limit.value,
    categories:
      selectedCategory.value && selectedCategory.value !== ALL_FILTER
        ? [selectedCategory.value]
        : undefined,
    ratingLabel:
      selectedRating.value && selectedRating.value !== ALL_FILTER
        ? selectedRating.value
        : undefined,
  });
}
</script>
