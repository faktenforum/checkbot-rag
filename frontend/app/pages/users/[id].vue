<script lang="ts" setup>
import type { User } from "@checkbot/core";

const route = useRoute();
const { t } = useI18n();
const { get, update, updatePassword, deactivate } = useUsers();

const id = route.params.id as string;
const { data: user, refresh } = useAsyncData<User>(`user-${id}`, () => get(id));

const form = reactive({ name: "", permissions: [] as string[] });
const passwordForm = reactive({ password: "", confirm: "" });

watch(user, (u) => {
  if (u) {
    form.name = u.name;
    form.permissions = [...u.permissions];
  }
}, { immediate: true });

const error = ref("");
const pwError = ref("");
const loading = ref(false);
const pwLoading = ref(false);
const saved = ref(false);
const pwSaved = ref(false);

async function saveProfile() {
  error.value = "";
  loading.value = true;
  try {
    await update(id, { name: form.name, permissions: form.permissions });
    await refresh();
    saved.value = true;
    setTimeout(() => (saved.value = false), 2000);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}

async function savePassword() {
  pwError.value = "";
  if (passwordForm.password !== passwordForm.confirm) {
    pwError.value = t("users.passwordMismatch");
    return;
  }
  pwLoading.value = true;
  try {
    await updatePassword(id, passwordForm.password);
    passwordForm.password = "";
    passwordForm.confirm = "";
    pwSaved.value = true;
    setTimeout(() => (pwSaved.value = false), 2000);
  } catch (err) {
    pwError.value = (err as Error).message;
  } finally {
    pwLoading.value = false;
  }
}

async function handleDeactivate() {
  try {
    await deactivate(id);
    await refresh();
  } catch (err) {
    error.value = (err as Error).message;
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6" v-if="user">
    <div class="flex items-center gap-3">
      <UButton to="/users" variant="ghost" icon="i-heroicons-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ user.name }}</h1>
      <UBadge :color="user.active ? 'success' : 'neutral'" size="xs">
        {{ user.active ? t("common.active") : t("common.inactive") }}
      </UBadge>
      <UBadge v-if="user.source === 'env_bootstrap'" color="warning" size="xs">env</UBadge>
    </div>

    <!-- Profile form -->
    <UCard>
      <template #header><h2 class="font-semibold">{{ t("users.profile") }}</h2></template>
      <form class="space-y-4" @submit.prevent="saveProfile">
        <UFormField :label="t('users.name')">
          <UInput v-model="form.name" :disabled="user.source === 'env_bootstrap'" class="w-full" />
        </UFormField>

        <UFormField :label="t('users.permissions')">
          <PermissionPicker v-model="form.permissions" :disabled="user.source === 'env_bootstrap'" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />
        <UAlert v-if="saved" color="success" :description="t('common.saved')" />

        <div class="flex justify-between">
          <UButton
            v-if="user.active && user.source !== 'env_bootstrap'"
            color="warning"
            variant="ghost"
            @click="handleDeactivate"
          >
            {{ t("users.deactivate") }}
          </UButton>
          <UButton type="submit" :loading="loading" :disabled="user.source === 'env_bootstrap'" class="ml-auto">
            {{ t("common.save") }}
          </UButton>
        </div>
      </form>
    </UCard>

    <!-- Password change (human users only) -->
    <UCard v-if="user.userType === 'human'">
      <template #header><h2 class="font-semibold">{{ t("users.changePassword") }}</h2></template>
      <form class="space-y-4" @submit.prevent="savePassword">
        <UFormField :label="t('auth.password')">
          <UInput v-model="passwordForm.password" type="password" class="w-full" />
        </UFormField>
        <UFormField :label="t('users.confirmPassword')">
          <UInput v-model="passwordForm.confirm" type="password" class="w-full" />
        </UFormField>
        <UAlert v-if="pwError" color="error" :description="pwError" />
        <UAlert v-if="pwSaved" color="success" :description="t('common.saved')" />
        <div class="flex justify-end">
          <UButton type="submit" :loading="pwLoading">{{ t("common.save") }}</UButton>
        </div>
      </form>
    </UCard>

    <!-- API keys for this user -->
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ t("nav.apiKeys") }}</h2>
          <UButton :to="`/api-keys/new?userId=${user.id}`" size="xs" icon="i-heroicons-plus">
            {{ t("apiKeys.create") }}
          </UButton>
        </div>
      </template>
      <ApiKeyList :user-id="user.id" />
    </UCard>
  </div>
</template>
