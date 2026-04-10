<script lang="ts" setup>
definePageMeta({ middleware: "auth" });

const { t } = useI18n();
const { currentUser, fetchMe } = useAuth();
const { updatePassword } = useUsers();

const passwordForm = reactive({ password: "", confirm: "" });
const pwError = ref("");
const pwLoading = ref(false);
const pwSaved = ref(false);

async function savePassword() {
  pwError.value = "";
  if (passwordForm.password !== passwordForm.confirm) {
    pwError.value = t("users.passwordMismatch");
    return;
  }
  pwLoading.value = true;
  try {
    await updatePassword(currentUser.value!.id, passwordForm.password);
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
</script>

<template>
  <div class="max-w-lg space-y-6" v-if="currentUser">
    <div class="flex items-center gap-3">
      <h1 class="text-2xl font-bold">{{ currentUser.name }}</h1>
      <UBadge color="neutral" size="xs">{{ currentUser.userType }}</UBadge>
    </div>

    <UCard>
      <template #header><h2 class="font-semibold">{{ t("users.profile") }}</h2></template>
      <div class="space-y-2 text-sm">
        <div v-if="currentUser.email">
          <span class="text-muted">{{ t("auth.email") }}: </span>{{ currentUser.email }}
        </div>
        <div class="flex flex-wrap gap-1 items-center">
          <span class="text-muted mr-1">{{ t("users.permissions") }}:</span>
          <UBadge v-for="p in currentUser.permissions" :key="p" size="xs" color="neutral">{{ p }}</UBadge>
        </div>
      </div>
    </UCard>

    <UCard v-if="currentUser.userType === 'human'">
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

    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <h2 class="font-semibold">{{ t("nav.apiKeys") }}</h2>
          <UButton :to="`/keys/new?userId=${currentUser.id}`" size="xs" icon="i-heroicons-plus">
            {{ t("apiKeys.create") }}
          </UButton>
        </div>
      </template>
      <ApiKeyList :user-id="currentUser.id" />
    </UCard>
  </div>
</template>
