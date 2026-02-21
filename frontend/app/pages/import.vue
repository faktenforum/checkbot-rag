<template>
  <div class="space-y-6">
    <h1 class="h1 flex items-center gap-2">
      <UIcon name="i-heroicons-arrow-up-tray" class="w-6 h-6" />
      Import
    </h1>

    <!-- New import form -->
    <UCard>
      <template #header>
        <p class="font-medium">Faktenchecks importieren</p>
        <p class="text-sm text-neutral-500 mt-1">
          Vollständiger Pfad im Container:
          <code class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">/data/exports/&lt;Dateiname&gt;.json</code>.
          Dateien liegen im Host unter <code class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">dev/checkbot-rag/exports/</code>
          (Volume: <code class="text-xs bg-neutral-100 dark:bg-neutral-800 px-1 rounded">./dev/checkbot-rag/exports:/data/exports:ro</code>).
        </p>
      </template>

      <div class="space-y-4">
        <UInput
          v-model="filePath"
          placeholder="/data/exports/2026-02-18T19-29-23-254Z_claims_dump-sample.json"
          icon="i-heroicons-document"
        />
        <div class="flex justify-end">
          <UButton
            :loading="importing"
            icon="i-heroicons-play"
            @click="startImport"
          >
            Import starten
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
        <h2 class="h2">Import-Jobs</h2>
        <UButton
          variant="ghost"
          size="xs"
          icon="i-heroicons-arrow-path"
          :loading="fetchingJobs"
          @click="() => void refetch()"
        >
          Aktualisieren
        </UButton>
      </div>

      <div v-if="fetchingJobs && !jobs" class="text-center py-8 text-neutral-400">
        <UIcon name="i-heroicons-arrow-path" class="w-6 h-6 mx-auto animate-spin mb-2" />
      </div>

      <div v-else-if="!jobs?.length" class="text-center py-8 text-neutral-400">
        <p>Noch keine Import-Jobs</p>
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
          <p class="text-xs text-neutral-400 shrink-0">
            {{ new Date(job.createdAt).toLocaleString("de-DE") }}
          </p>
        </div>

        <!-- Progress bar -->
        <div v-if="job.status === 'running' || job.status === 'done'" class="space-y-1">
          <div class="w-full bg-neutral-200 dark:bg-neutral-700 rounded-full h-2">
            <div
              class="h-2 rounded-full transition-all"
              :class="job.status === 'done' ? 'bg-success-500' : 'bg-primary-500'"
              :style="{ width: `${job.total > 0 ? Math.round(((job.processed + job.skipped) / job.total) * 100) : 0}%` }"
            />
          </div>
          <div class="flex justify-between text-xs text-neutral-400">
            <span>
              {{ job.processed }} importiert · {{ job.skipped }} übersprungen · {{ job.errors }} Fehler
            </span>
            <span>{{ job.total }} gesamt</span>
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
import type { ImportJobStatus } from "../types/api";

const { apiFetch } = useApi();
const filePath = ref("/data/exports/claims_dump.json");
const importing = ref(false);
const importError = ref<string | null>(null);

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
      body: JSON.stringify({ filePath: filePath.value }),
    });
    await refetch();
  } catch (err) {
    importError.value = (err as Error).message;
  } finally {
    importing.value = false;
  }
}
</script>
