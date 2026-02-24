<script lang="ts" setup>
const route = useRoute();

const isMobileNavOpen = ref(false);

watch(
  () => route.path,
  () => {
    isMobileNavOpen.value = false;
  },
);
</script>

<template>
  <div class="flex h-dvh bg-default overflow-hidden">
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
          class="w-full p-2.5 mt-3.5 rounded-lg hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary text-default"
        >
          <LogoComplete class="block w-full h-auto" />
        </NuxtLink>
      </template>
      <template #default>
        <div class="p-2.5 flex flex-col gap-1">
          <SidebarNav />
        </div>
      </template>
    </UDashboardSidebar>
    <div class="flex-1 min-w-0 flex flex-col overflow-hidden">
      <header
        class="xl:hidden flex items-center justify-between h-12 shrink-0 border-b border-default bg-default px-4"
      >
        <div class="flex items-center gap-3">
          <UButton
            icon="i-heroicons-bars-3"
            variant="ghost"
            color="neutral"
            aria-label="Navigation öffnen"
            @click="isMobileNavOpen = true"
          />
          <NuxtLink to="/" class="flex items-center gap-2 text-default">
            <LogoComplete class="block h-8 w-auto mt-2.5" />
          </NuxtLink>
        </div>
      </header>
      <div class="flex-1 min-w-0 flex flex-col overflow-y-auto p-4 md:p-8">
        <slot />
      </div>
    </div>
    <UDrawer
      v-model:open="isMobileNavOpen"
      direction="left"
      :ui="{ container: 'w-64 max-w-[80vw]' }"
      class="xl:hidden"
      @close="isMobileNavOpen = false"
    >
      <template #body>
        <div class="p-2.5 flex flex-col gap-1">
          <SidebarNav />
        </div>
      </template>
    </UDrawer>
  </div>
</template>
