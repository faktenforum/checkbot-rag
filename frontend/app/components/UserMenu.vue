<script lang="ts" setup>
const { currentUser, logout } = useAuth();
const { t } = useI18n();

const items = computed(() => [
  [
    {
      label: currentUser.value?.name ?? "",
      slot: "account",
      disabled: true,
    },
  ],
  [
    {
      label: t("nav.userMenu"),
      icon: "i-heroicons-user",
      to: "/profile",
    },
  ],
  [
    {
      label: t("auth.logout"),
      icon: "i-heroicons-arrow-right-on-rectangle",
      onSelect: logout,
    },
  ],
]);
</script>

<template>
  <UDropdownMenu v-if="currentUser" :items="items">
    <UButton
      variant="ghost"
      color="neutral"
      :icon="'i-heroicons-user-circle'"
      :aria-label="t('nav.userMenu')"
    />

    <template #account-leading>
      <UIcon name="i-heroicons-user-circle" class="w-5 h-5 text-muted" />
    </template>
  </UDropdownMenu>
</template>
