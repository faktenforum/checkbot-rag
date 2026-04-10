<script lang="ts" setup>
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { create } = useApiKeys();
const { currentUser, hasPermission } = useAuth();
const router = useRouter();
const route = useRoute();

const form = reactive({
  userId: (route.query.userId as string) ?? "",
  name: "",
  description: "",
  permissions: [] as string[],
  rateLimitPoints: null as number | null,
  rateLimitDurationSec: 60,
  expiresAt: "" as string,
});

// If not admin, force userId to own user id
watch(currentUser, (u) => {
  if (u && !hasPermission("users:write") && !form.userId) {
    form.userId = u.id;
  }
}, { immediate: true });

const error = ref("");
const loading = ref(false);
const created = ref<{ rawKey: string } | null>(null);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const input: {
      userId: string;
      name: string;
      description?: string | null;
      permissions: string[];
      rateLimitPoints?: number | null;
      rateLimitDurationSec?: number;
      expiresAt?: string | null;
    } = {
      userId: form.userId,
      name: form.name,
      permissions: form.permissions,
      rateLimitPoints: form.rateLimitPoints,
      rateLimitDurationSec: form.rateLimitDurationSec,
    };
    if (form.description) input.description = form.description;
    if (form.expiresAt) input.expiresAt = new Date(form.expiresAt).toISOString();

    const result = await create(input);
    created.value = { rawKey: result.rawKey };
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

function done() {
  router.push("/keys");
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/keys" variant="ghost" icon="i-heroicons-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ t("apiKeys.create") }}</h1>
    </div>

    <ApiKeyCreatedCard v-if="created" :raw-key="created.rawKey" @done="done" />

    <UCard v-else>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField v-if="hasPermission('users:write')" :label="t('apiKeys.userId')">
          <UInput v-model="form.userId" required class="w-full" :placeholder="t('apiKeys.userIdPlaceholder')" />
        </UFormField>

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

        <div class="flex justify-end gap-2">
          <UButton to="/keys" variant="ghost" color="neutral">{{ t("common.cancel") }}</UButton>
          <UButton type="submit" :loading="loading">{{ t("common.save") }}</UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
