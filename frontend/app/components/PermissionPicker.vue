<script lang="ts" setup>
import type { Permission } from "@search/core";

const props = defineProps<{
  modelValue: string[];
  availablePermissions?: string[];
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: string[]): void;
}>();

const ROLE_PRESETS: Record<string, string[]> = {
  admin: ["admin"],
  partner: ["claims:read", "search"],
  service: ["claims:read", "claims:write", "search", "import"],
  mcp_agent: ["mcp:use", "claims:read", "search"],
};

const ALL_PERMISSIONS = [
  "claims:read",
  "claims:write",
  "search",
  "import",
  "mcp:use",
  "users:read",
  "users:write",
  "api_keys:read_all",
  "admin",
] as const;

const available = computed(() => props.availablePermissions ?? [...ALL_PERMISSIONS]);

function toggle(perm: string) {
  const current = new Set(props.modelValue);
  if (current.has(perm)) {
    current.delete(perm);
  } else {
    current.add(perm);
  }
  emit("update:modelValue", [...current]);
}

function applyPreset(role: string) {
  emit("update:modelValue", [...(ROLE_PRESETS[role] ?? [])]);
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex flex-wrap gap-2">
      <UButton
        v-for="(_, role) in ROLE_PRESETS"
        :key="role"
        size="xs"
        variant="outline"
        color="neutral"
        @click="applyPreset(role)"
      >
        {{ role }}
      </UButton>
    </div>
    <div class="flex flex-wrap gap-2">
      <UBadge
        v-for="perm in available"
        :key="perm"
        :color="modelValue.includes(perm) ? 'primary' : 'neutral'"
        :variant="modelValue.includes(perm) ? 'solid' : 'outline'"
        class="cursor-pointer select-none"
        @click="toggle(perm)"
      >
        {{ perm }}
      </UBadge>
    </div>
  </div>
</template>
