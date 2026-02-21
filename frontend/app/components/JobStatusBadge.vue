<script setup lang="ts">
defineProps<{
  status: "pending" | "running" | "done" | "failed";
}>();

const labelByStatus: Record<string, string> = {
  pending: "Ausstehend",
  running: "Läuft",
  done: "Fertig",
  failed: "Fehlgeschlagen",
};

const colorByStatus: Record<string, string> = {
  pending: "neutral",
  running: "primary",
  done: "success",
  failed: "error",
};

const iconByStatus: Record<string, string> = {
  pending: "i-heroicons-clock",
  running: "i-heroicons-arrow-path",
  done: "i-heroicons-check-circle",
  failed: "i-heroicons-exclamation-circle",
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
