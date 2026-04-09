<script lang="ts" setup>
const { t } = useI18n();
const { create } = useUsers();
const router = useRouter();

const form = reactive({
  userType: "service" as "human" | "service",
  name: "",
  email: "",
  password: "",
  permissions: [] as string[],
});
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    const input = {
      userType: form.userType,
      name: form.name,
      permissions: form.permissions,
      ...(form.userType === "human"
        ? { email: form.email, password: form.password }
        : {}),
    };
    const user = await create(input);
    router.push(`/users/${user.id}`);
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="max-w-lg space-y-6">
    <div class="flex items-center gap-3">
      <UButton to="/users" variant="ghost" icon="i-heroicons-arrow-left" size="sm" />
      <h1 class="text-2xl font-bold">{{ t("users.create") }}</h1>
    </div>

    <UCard>
      <form class="space-y-4" @submit.prevent="submit">
        <UFormField :label="t('users.type')">
          <USelect v-model="form.userType" :items="['human', 'service']" class="w-full" />
        </UFormField>

        <UFormField :label="t('users.name')">
          <UInput v-model="form.name" required class="w-full" />
        </UFormField>

        <template v-if="form.userType === 'human'">
          <UFormField :label="t('users.email')">
            <UInput v-model="form.email" type="email" required class="w-full" />
          </UFormField>
          <UFormField :label="t('auth.password')">
            <UInput v-model="form.password" type="password" required class="w-full" />
          </UFormField>
        </template>

        <UFormField :label="t('users.permissions')">
          <PermissionPicker v-model="form.permissions" />
        </UFormField>

        <UAlert v-if="error" color="error" :description="error" />

        <div class="flex justify-end gap-2">
          <UButton to="/users" variant="ghost" color="neutral">{{ t("common.cancel") }}</UButton>
          <UButton type="submit" :loading="loading">{{ t("common.save") }}</UButton>
        </div>
      </form>
    </UCard>
  </div>
</template>
