<template>
  <UBadge :color="badgeColor" variant="subtle" size="sm">
    {{ label ?? "unbekannt" }}
  </UBadge>
</template>

<script setup lang="ts">
const props = defineProps<{ label: string | null | undefined }>();

const badgeColor = computed(() => {
  switch (props.label?.toLowerCase()) {
    case "true":
    case "correct":
      return "success";
    case "false":
    case "incorrect":
      return "error";
    case "misleading":
    case "partially_true":
    case "unverifiable":
      return "warning";
    default:
      return "neutral";
  }
});
</script>
