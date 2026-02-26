<template>
  <div class="space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/claims" variant="ghost" icon="i-heroicons-arrow-left" size="sm">
        {{ t('common.back') }}
      </UButton>
      <h1 class="h1 truncate">
        {{ claim?.short_id ?? t('claims.factcheck') }}
      </h1>
    </div>

    <div v-if="isPending" class="text-center py-12">
      <UIcon name="i-heroicons-arrow-path" class="w-8 h-8 mx-auto animate-spin text-neutral-400" />
    </div>

    <UAlert v-else-if="error" color="error" :description="error.message" />

    <template v-else-if="claim">
      <!-- Claim header card -->
      <UCard>
        <div class="space-y-4">
          <div class="flex items-start justify-between gap-4">
            <p class="font-semibold text-lg leading-snug flex-1">{{ claim.synopsis }}</p>
            <RatingBadge :label="claim.rating_label" />
          </div>

          <div v-if="claim.rating_summary" class="text-neutral-600 dark:text-neutral-400">
            {{ claim.rating_summary }}
          </div>

          <div
            v-if="claim.rating_statement"
            class="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-sm leading-relaxed"
          >
            <p class="text-xs text-neutral-400 font-medium uppercase tracking-wide mb-2">{{ t('claim.assessment') }}</p>
            <p>{{ claim.rating_statement }}</p>
          </div>

          <div class="flex flex-wrap gap-2 text-sm text-neutral-500">
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-tag" class="w-4 h-4" />
              <span>{{ (claim.categories ?? []).join(", ") || t('common.na') }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-calendar" class="w-4 h-4" />
              <span>{{
                claim.publishing_date
                  ? formatDate(claim.publishing_date)
                  : t('common.na')
              }}</span>
            </div>
            <div class="flex items-center gap-1">
              <UIcon name="i-heroicons-check-circle" class="w-4 h-4" />
              <span>{{ claim.status }}</span>
            </div>
            <div v-if="claim.language" class="flex items-center gap-1">
              <UIcon name="i-heroicons-language" class="w-4 h-4" />
              <span>{{ claim.language }}</span>
            </div>
          </div>

          <div class="flex justify-end">
            <UButton
              v-if="claim.publishing_url"
              :to="claim.publishing_url"
              target="_blank"
              variant="soft"
              icon="i-heroicons-arrow-top-right-on-square"
              size="sm"
            >
              {{ t('claim.toFactcheck') }}
            </UButton>
          </div>
        </div>
      </UCard>

      <!-- Chunks -->
      <div class="space-y-3">
        <h2 class="h2 flex items-center gap-2">
          <UIcon name="i-heroicons-squares-2x2" class="w-5 h-5" />
          {{ t('claim.chunksTitle') }} ({{ claim.chunks?.length ?? 0 }})
          <UBadge color="neutral" variant="soft" size="xs">
            {{ t('claim.embeddingUnits') }}
          </UBadge>
        </h2>

        <UCard
          v-for="chunk in sortedChunks"
          :key="chunk.id"
          class="border-l-2"
          :class="chunk.chunk_type === 'claim_overview' ? 'border-primary-400' : 'border-neutral-300'"
        >
          <div class="space-y-2">
            <div class="flex items-center gap-2">
              <UBadge
                :color="chunk.chunk_type === 'claim_overview' ? 'primary' : 'neutral'"
                variant="soft"
                size="xs"
              >
                {{ chunk.chunk_type === "claim_overview" ? t('claim.chunkOverview') : t('claim.chunkFact', { n: chunk.fact_index }) }}
              </UBadge>
              <span class="text-xs text-neutral-400">{{ t('claim.charCount', { n: chunk.content.length }) }}</span>
            </div>
            <p class="text-sm text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
              {{ chunk.content }}
            </p>
          </div>
        </UCard>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import type { ClaimDetail } from "../../types/api";

const route = useRoute();
const { t } = useI18n();
const { formatDate } = useLocaleDate();
const { apiFetch } = useApi();

// Catch-all [...id]: id can be "2026/01/27-2" (one segment) or ["2026","01","27-2"] (multiple segments)
const claimId = computed(() => {
  const id = route.params.id;
  if (Array.isArray(id)) return id.join("/");
  return id ?? "";
});

const { data: claim, isPending, error } = useQuery<ClaimDetail>({
  queryKey: computed(() => ["claim", claimId.value]),
  queryFn: () => apiFetch<ClaimDetail>(`/api/v1/claims/${encodeURIComponent(claimId.value)}`),
});

const sortedChunks = computed(() => {
  const chunks = claim.value?.chunks ?? [];
  return [...chunks].sort((a, b) => {
    if (a.chunk_type === "claim_overview") return -1;
    if (b.chunk_type === "claim_overview") return 1;
    return (a.fact_index ?? 0) - (b.fact_index ?? 0);
  });
});
</script>
