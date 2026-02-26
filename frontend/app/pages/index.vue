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
          {{ t('search.title') }}
        </h1>
      </template>

      <div class="space-y-4">
        <div class="flex gap-2">
          <UInput
            v-model="query"
            :placeholder="t('search.placeholder')"
            class="flex-1"
            size="lg"
            :loading="pending"
            @keyup.enter="doSearch"
          />
          <UButton size="lg" :loading="pending" icon="i-heroicons-magnifying-glass" @click="doSearch">
            {{ t('search.button') }}
          </UButton>
        </div>

        <!-- Filters row -->
        <div class="flex flex-wrap gap-3 items-center">
          <USelect
            v-model="selectedRating"
            :items="ratingOptions"
            :placeholder="t('filter.rating')"
            size="sm"
            class="w-40"
          />
          <USelect
            v-model="selectedCategory"
            :items="categoryOptions"
            :placeholder="t('filter.category')"
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
            :placeholder="t('filter.language')"
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
          {{ t('search.resultsCount', { count: results.totalResults, query: results.query }) }}
        </p>
      </div>

      <div v-if="results.claims.length === 0" class="text-center py-12 text-neutral-400">
        <UIcon name="i-heroicons-face-frown" class="w-12 h-12 mx-auto mb-3" />
        <p>{{ t('search.noResults') }}</p>
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
                  • {{ t('search.languageLabel') }}: {{ claim.language }}
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
            <p class="text-xs text-neutral-400 mb-1">{{ t('search.relevantSnippet') }}</p>
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
                {{ t('search.score') }}: {{ claim.bestScore.toFixed(4) }}
              </span>
              <UButton
                v-if="claim.publishingUrl"
                :to="claim.publishingUrl"
                target="_blank"
                variant="ghost"
                size="xs"
                icon="i-heroicons-arrow-top-right-on-square"
              >
                {{ t('common.source') }}
              </UButton>
              <UButton
                :to="`/claims/${claim.shortId}`"
                variant="soft"
                size="xs"
                icon="i-heroicons-eye"
              >
                {{ t('common.details') }}
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

const { t } = useI18n();
const { results, pending, error, language, search } = useSearch();
const { data: stats } = useStats();

const query = ref("");
const selectedRating = ref<string>(ALL_FILTER);
const selectedCategory = ref<string>(ALL_FILTER);
const limit = ref(10);

const ratingOptions = computed(() => [
  { label: t("filter.allRatings"), value: ALL_FILTER },
  ...(stats.value?.ratingLabels.map((r) => ({
    label: `${r.rating_label} (${r.count})`,
    value: r.rating_label,
  })) ?? []),
]);

const categoryOptions = computed(() => [
  { label: t("filter.allCategories"), value: ALL_FILTER },
  ...(stats.value?.categories.map((c) => ({
    label: `${c.category} (${c.count})`,
    value: c.category,
  })) ?? []),
]);

const limitOptions = computed(() => [
  { label: t("limit.n5"), value: 5 },
  { label: t("limit.n10"), value: 10 },
  { label: t("limit.n20"), value: 20 },
]);

const languageOptions = computed(() => [
  { label: t("language.auto"), value: "auto" },
  { label: t("language.de"), value: "de" },
  { label: t("language.en"), value: "en" },
  { label: t("language.fr"), value: "fr" },
  { label: t("language.es"), value: "es" },
  { label: t("language.it"), value: "it" },
  { label: t("language.pt"), value: "pt" },
]);

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
