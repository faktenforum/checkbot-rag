<script lang="ts" setup>
const route = useRoute();
const { t, locale, setLocale } = useI18n();

type NavItem = {
  label: string;
  icon: string;
  to: string;
  isActive?: (path: string) => boolean;
};

const items = computed<NavItem[]>(() => [
  {
    label: t("nav.start"),
    icon: "i-heroicons-home",
    to: "/",
    isActive: (path) => path === "/",
  },
  {
    label: t("nav.claims"),
    icon: "i-heroicons-document-text",
    to: "/claims",
    isActive: (path) => path.startsWith("/claims"),
  },
  {
    label: t("nav.import"),
    icon: "i-heroicons-arrow-up-tray",
    to: "/import",
    isActive: (path) => path === "/import",
  },
]);

const isActive = (item: NavItem) => (item.isActive ? item.isActive(route.path) : route.path === item.to);

const locales = [
  { code: "de" as const, labelKey: "language.de" },
  { code: "en" as const, labelKey: "language.en" },
];
</script>

<template>
  <div class="flex h-full flex-col gap-4">
    <nav :aria-label="t('nav.ariaLabel')" class="flex-1 min-h-0">
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
    <div class="mt-auto flex gap-1 border-t border-default pt-2">
      <UButton
        v-for="loc in locales"
        :key="loc.code"
        variant="ghost"
        size="xs"
        :color="locale === loc.code ? 'primary' : 'neutral'"
        class="flex-1"
        @click="setLocale(loc.code)"
      >
        {{ t(loc.labelKey) }}
      </UButton>
    </div>
  </div>
</template>

