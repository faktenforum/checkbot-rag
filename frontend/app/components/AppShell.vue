<script lang="ts" setup>
import type { NavigationMenuItem } from "@nuxt/ui";

const route = useRoute();

const navItems = computed((): NavigationMenuItem[] => [
  {
    label: "Start",
    icon: "i-heroicons-home",
    to: "/",
    active: route.path === "/",
  },
  {
    label: "Claims",
    icon: "i-heroicons-document-text",
    to: "/claims",
    active: route.path.startsWith("/claims"),
  },
  {
    label: "Import",
    icon: "i-heroicons-arrow-up-tray",
    to: "/import",
    active: route.path === "/import",
  },
]);
</script>

<template>
  <div class="flex min-h-dvh bg-default">
    <UDashboardSidebar
      :ui="{
        root: 'max-xl:!hidden w-60 h-dvh shrink-0',
        header: 'px-1.5 pb-1 h-[72px]',
        body: 'p-0 overflow-y-auto block',
      }"
    >
      <template #header>
        <NuxtLink
          to="/"
          class="w-full p-2.5 mt-3.5 rounded-lg text-default hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary focus-visible:text-primary"
        >
          <span class="text-lg font-semibold">Checkbot RAG</span>
        </NuxtLink>
      </template>
      <template #default>
        <div class="p-2.5 flex flex-col gap-1">
          <UNavigationMenu
            :items="navItems"
            orientation="vertical"
            highlight
            color="primary"
            size="lg"
          />
        </div>
      </template>
    </UDashboardSidebar>
    <div class="flex-1 min-w-0 p-4 md:p-8">
      <slot />
    </div>
  </div>
</template>
