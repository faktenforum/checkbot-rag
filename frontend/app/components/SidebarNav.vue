<script lang="ts" setup>
const route = useRoute();

type NavItem = {
  label: string;
  icon: string;
  to: string;
  isActive?: (path: string) => boolean;
};

const items: NavItem[] = [
  {
    label: "Start",
    icon: "i-heroicons-home",
    to: "/",
    isActive: (path) => path === "/",
  },
  {
    label: "Claims",
    icon: "i-heroicons-document-text",
    to: "/claims",
    isActive: (path) => path.startsWith("/claims"),
  },
  {
    label: "Import",
    icon: "i-heroicons-arrow-up-tray",
    to: "/import",
    isActive: (path) => path === "/import",
  },
];

const isActive = (item: NavItem) => (item.isActive ? item.isActive(route.path) : route.path === item.to);
</script>

<template>
  <nav aria-label="Hauptnavigation">
    <ul class="flex flex-col gap-1">
      <li v-for="item in items" :key="item.to">
        <NuxtLink
          :to="item.to"
          class="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm transition-colors"
          :class="
            isActive(item)
              ? 'bg-primary/10 text-default'
              : 'text-muted hover:text-default hover:bg-elevated'
          "
        >
          <UIcon
            :name="item.icon"
            class="h-5 w-5"
            :class="isActive(item) ? 'text-primary' : 'text-muted'"
          />
          <span>{{ item.label }}</span>
        </NuxtLink>
      </li>
    </ul>
  </nav>
</template>

