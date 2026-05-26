<script lang="ts" setup>
import type { ApiKey } from "@search/core";


const route = useRoute();
const { t } = useI18n();
const { get, update, revoke, deleteKey } = useApiKeys();

const id = route.params.id as string;
const { data: key, refresh } = useAsyncData<ApiKey>(`api-key-${id}`, () => get(id));

const form = reactive({
  name: "",
  description: "",
  permissions: [] as string[],
  rateLimitPoints: null as number | null,
  rateLimitDurationSec: 60,
  expiresAt: "",
  active: true,
});

watch(key, (k) => {
  if (k) {
    form.name = k.name;
    form.description = k.description ?? "";
    form.permissions = [...k.permissions];
    form.rateLimitPoints = k.rateLimitPoints ?? null;
    form.rateLimitDurationSec = k.rateLimitDurationSec;
    form.expiresAt = k.expiresAt ? new Date(k.expiresAt).toISOString().slice(0, 16) : "";
    form.active = k.active;
  }
}, { immediate: true });

const error = ref("");
const loading = ref(false);
const saved = ref(false);

async function save() {
  error.value = "";
  loading.value = true;
  try {
    await update(id, {
      name: form.name,
      description: form.description || null,
      permissions: form.permissions,
      rateLimitPoints: form.rateLimitPoints,
      rateLimitDurationSec: form.rateLimitDurationSec,
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      active: form.active,
    });
    await refresh();
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function handleRevoke() {
  try {
    await revoke(id);
    await refresh();
  } catch (err) {
    error.value = (err as Error).message;
  }
}

const router = useRouter();
async function handleDelete() {
  try {
    await deleteKey(id);
    router.push("/keys");
  } catch (err) {
    error.value = (err as Error).message;
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6" v-if="key">
    <div class="flex items-center gap-3">
      <UButton to="/keys" variant="ghost" icon="i-heroicons-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ key.name }}</h1>
      <UBadge :color="key.active ? 'success' : 'neutral'" size="xs">
        {{ key.active ? t("common.active") : t("common.inactive") }}
      </UBadge>
    </div>

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ t("apiKeys.details") }}</h2>
          <div class="flex gap-2">
            <UButton
              v-if="key.active"
              size="xs"
              variant="ghost"
              color="warning"
              icon="i-heroicons-no-symbol"
              @click="handleRevoke"
            >{{ t("apiKeys.revoke") }}</UButton>
            <UButton
              size="xs"
              variant="ghost"
              color="error"
              icon="i-heroicons-trash"
              @click="handleDelete"
            >{{ t("common.delete") }}</UButton>
          </div>
        </div>
      </template>

      <form class="space-y-4" @submit.prevent="save">
        <div class="text-sm text-muted">
          <span class="font-mono">{{ key.keyPrefix }}…</span>
          <span class="ml-2 text-xs">{{ t("apiKeys.prefix") }}</span>
        </div>

        <UFormField :label="t('apiKeys.name')">
          <UInput v-model="form.name" required class="w-full" />
        </UFormField>

        <UFormField :label="t('apiKeys.description')">
          <UInput v-model="form.description" class="w-full" />
        </UFormField>

        <UFormField :label="t('users.permissions')">
          <PermissionPicker v-model="form.permissions" />
        </UFormField>

        <UFormField :label="t('apiKeys.rateLimitPoints')">
          <UInput
            v-model.number="form.rateLimitPoints"
            type="number"
            min="1"
            class="w-full"
            :placeholder="t('apiKeys.unlimited')"
          />
        </UFormField>

        <UFormField :label="t('apiKeys.rateLimitDuration')">
          <UInput v-model.number="form.rateLimitDurationSec" type="number" min="1" class="w-full" />
        </UFormField>

        <UFormField :label="t('apiKeys.expiresAt')">
          <UInput v-model="form.expiresAt" type="datetime-local" class="w-full" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />
        <UAlert v-if="saved" color="success" :description="t('common.saved')" />

        <div class="flex justify-end">
          <UButton type="submit" :loading="loading">{{ t("common.save") }}</UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
