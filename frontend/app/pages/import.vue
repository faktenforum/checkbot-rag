<template>
  <div class="space-y-6">
    <h1 class="h1 flex items-center gap-2">
      <UIcon name="i-heroicons-arrow-up-tray" class="w-6 h-6" />
      {{ t('import.title') }}
    </h1>

    <!-- New import form -->
    <UCard>
      <template #header>
        <p class="font-medium">{{ t('import.cardTitle') }}</p>
        <p class="text-sm text-neutral-500 mt-1">
          {{ t('import.pathIntro') }}
          <code class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">/data/exports/&lt;Dateiname&gt;.json</code>.
          {{ t('import.pathVolume') }}
          <code class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">dev/checkbot-rag/exports/</code>
          {{ t('import.pathVolumeSuffix') }}
          <code class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">./dev/checkbot-rag/exports:/data/exports:ro</code>).
        </p>
      </template>

      <div class="space-y-4">
        <UInput
          v-model="filePath"
          :placeholder="t('import.placeholderPath')"
          icon="i-heroicons-document"
        />

        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-sm text-neutral-600 dark:text-neutral-300">{{ t('import.claimsLanguage') }}</span>
            <USelect
              v-model="language"
              :options="languageOptions"
              option-attribute="label"
              value-attribute="value"
              class="w-40"
            />
          </div>

          <div class="flex-1" />

          <UButton
            :loading="importing"
            icon="i-heroicons-play"
            @click="startImport"
          >
            {{ t('import.startButton') }}
          </UButton>
        </div>
      </div>

      <UAlert
        v-if="importError"
        class="mt-4"
        color="error"
        :description="importError"
        icon="i-heroicons-exclamation-circle"
      />
    </UCard>

    <!-- Active and recent jobs -->
    <div class="space-y-3">
      <div class="flex items-center justify-between">
        <h2 class="h2">{{ t('import.jobsTitle') }}</h2>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-heroicons-arrow-path"
          :loading="fetchingJobs"
          @click="() => void refetch()"
        >
          {{ t('import.refresh') }}
        </UButton>
      </div>

      <div v-if="fetchingJobs && !jobs" class="text-center py-8 text-neutral-400">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 mx-auto animate-spin mb-2" />
      </div>

      <div v-else-if="!jobs?.length" class="text-center py-8 text-neutral-400">
        <p>{{ t('import.noJobs') }}</p>
      </div>

      <UCard v-for="job in jobs" :key="job.id" class="space-y-3">
        <div class="flex items-start justify-between gap-4">
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <JobStatusBadge :status="job.status" />
              <p class="text-sm font-medium truncate">{{ job.source }}</p>
            </div>
            <p class="text-xs text-neutral-400 mt-1">{{ job.id }}</p>
          </div>
          <div class="flex flex-col items-end gap-1 shrink-0 text-right">
            <p class="text-xs text-neutral-400">
              {{ formatDateTime(job.createdAt) }}
            </p>
            <div class="flex gap-2">
              <UButton
                v-if="job.status === 'pending' || job.status === 'running'"
                color="warning"
                size="xs"
                variant="ghost"
                icon="i-heroicons-x-mark"
                :loading="actionLoadingId === job.id && currentAction === 'cancel'"
                @click="() => cancelJob(job.id)"
              >
                {{ t('import.cancel') }}
              </UButton>
              <UButton
                v-if="job.status === 'done' || job.status === 'failed' || job.status === 'canceled'"
                color="neutral"
                size="xs"
                variant="ghost"
                icon="i-heroicons-trash"
                :loading="actionLoadingId === job.id && currentAction === 'delete'"
                @click="() => deleteJob(job.id)"
              >
                {{ t('import.delete') }}
              </UButton>
            </div>
          </div>
        </div>

        <!-- Progress bar -->
        <div
          v-if="job.status === 'running' || job.status === 'done'"
          class="space-y-1"
        >
          <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="job.status === 'done' ? 'bg-success-500' : 'bg-primary-500'"
              :style="{
                width: `${job.total > 0 ? Math.round(((job.processed + job.skipped) / job.total) * 100) : 0}%`,
              }"
            />
          </div>
          <div class="flex justify-between text-xs text-neutral-400">
            <span>
              {{ t('import.progress', { processed: job.processed, skipped: job.skipped, errors: job.errors }) }}
            </span>
            <span>{{ t('import.total', { count: job.total }) }}</span>
          </div>
        </div>

        <UAlert
          v-if="job.errorMessage"
          color="error"
          size="sm"
          :description="job.errorMessage"
        />
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useQuery } from "@tanstack/vue-query";
import type { ImportJobStatus, ImportRequest } from "../types/api";

const { t } = useI18n();
const { formatDateTime } = useLocaleDate();
const { apiFetch } = useApi();
const filePath = ref("/data/exports/claims_dump.json");
const language = ref<string>("de");
const importing = ref(false);
const importError = ref<string | null>(null);
const actionLoadingId = ref<string | null>(null);
const currentAction = ref<"cancel" | "delete" | null>(null);

const {
  data: jobs,
  isPending: fetchingJobs,
  refetch,
} = useQuery<ImportJobStatus[]>({
  queryKey: ["import-jobs"],
  queryFn: () => apiFetch<ImportJobStatus[]>("/api/v1/import/jobs"),
  refetchInterval: (query) => {
    const hasRunning = query.state.data?.some((j) => j.status === "running");
    return hasRunning ? 2000 : false;
  },
});

async function startImport() {
  if (!filePath.value.trim()) return;
  importing.value = true;
  importError.value = null;
  try {
    await apiFetch("/api/v1/import", {
      method: "POST",
      body: JSON.stringify({
        filePath: filePath.value,
        language: language.value,
      } satisfies ImportRequest),
    });
    await refetch();
  } catch (err) {
    importError.value = (err as Error).message;
  } finally {
    importing.value = false;
  }
}

async function cancelJob(jobId: string) {
  actionLoadingId.value = jobId;
  currentAction.value = "cancel";
  importError.value = null;
  try {
    await apiFetch(`/api/v1/import/jobs/${jobId}/cancel`, {
      method: "POST",
    });
    await refetch();
  } catch (err) {
    importError.value = (err as Error).message;
  } finally {
    actionLoadingId.value = null;
    currentAction.value = null;
  }
}

async function deleteJob(jobId: string) {
  actionLoadingId.value = jobId;
  currentAction.value = "delete";
  importError.value = null;
  try {
    await apiFetch(`/api/v1/import/jobs/${jobId}`, {
      method: "DELETE",
    });
    await refetch();
  } catch (err) {
    importError.value = (err as Error).message;
  } finally {
    actionLoadingId.value = null;
    currentAction.value = null;
  }
}

const languageOptions = computed(() => [
  { label: t("language.de"), value: "de" },
  { label: t("language.en"), value: "en" },
  { label: t("language.fr"), value: "fr" },
  { label: t("language.es"), value: "es" },
  { label: t("language.it"), value: "it" },
  { label: t("language.pt"), value: "pt" },
]);
</script>
