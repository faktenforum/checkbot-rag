<script lang="ts" setup>
definePageMeta({ layout: "login" });

const { login } = useAuth();
const { t } = useI18n();
const router = useRouter();

const email = ref("");
const password = ref("");
const error = ref("");
const loading = ref(false);

async function submit() {
  error.value = "";
  loading.value = true;
  try {
    await login(email.value, password.value);
    router.push("/");
  } catch (err) {
    error.value = (err as Error).message;
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UCard class="w-full max-w-sm">
    <template #header>
      <div class="flex flex-col items-center gap-3 py-2">
        <LogoComplete class="w-40 h-auto" />
        <h1 class="text-xl font-semibold">{{ t("auth.signIn") }}</h1>
      </div>
    </template>

    <form class="space-y-4" @submit.prevent="submit">
      <UFormField :label="t('auth.email')">
        <UInput
          v-model="email"
          type="email"
          autocomplete="email"
          :placeholder="t('auth.emailPlaceholder')"
          required
          class="w-full"
        />
      </UFormField>

      <UFormField :label="t('auth.password')">
        <UInput
          v-model="password"
          type="password"
          autocomplete="current-password"
          :placeholder="t('auth.passwordPlaceholder')"
          required
          class="w-full"
        />
      </UFormField>

      <UAlert v-if="error" color="error" icon="i-heroicons-exclamation-circle" :description="error" />

      <UButton type="submit" class="w-full" :loading="loading">
        {{ t("auth.signIn") }}
      </UButton>
    </form>
  </UCard>
</template>
