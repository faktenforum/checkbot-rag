<script setup lang="ts">
type JobStatus = "pending" | "running" | "done" | "failed" | "canceled";
type BadgeColor = "primary" | "success" | "warning" | "error" | "neutral";

defineProps<{
  status: JobStatus;
}>();

const { t } = useI18n();

const labelByStatus = computed<Record<JobStatus, string>>(() => ({
  pending: t("jobStatus.pending"),
  running: t("jobStatus.running"),
  done: t("jobStatus.done"),
  failed: t("jobStatus.failed"),
  canceled: t("jobStatus.canceled"),
}));

const colorByStatus: Record<JobStatus, BadgeColor> = {
  pending: "neutral",
  running: "primary",
  done: "success",
  failed: "error",
  canceled: "warning",
};

const iconByStatus: Record<string, string> = {
  pending: "i-heroicons-clock",
  running: "i-heroicons-arrow-path",
  done: "i-heroicons-check-circle",
  failed: "i-heroicons-exclamation-circle",
  canceled: "i-heroicons-x-circle",
};
</script>

<template>
  <UBadge
    :color="colorByStatus[status] ?? 'neutral'"
    variant="soft"
    size="sm"
    class="gap-1"
  >
    <UIcon
      :name="iconByStatus[status] ?? 'i-heroicons-question-mark-circle'"
      class="shrink-0"
      :class="status === 'running' ? 'animate-spin' : ''"
    />
    {{ labelByStatus[status] ?? status }}
  </UBadge>
</template>
