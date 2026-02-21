<script lang="ts" setup>
const route = useRoute();

const navLinks = [
  { to: "/claims", label: "Claims" },
  { to: "/import", label: "Import" },
];
</script>

<template>
  <div class="min-h-dvh flex flex-col bg-default">
    <header
      class="sticky top-0 z-10 shrink-0 flex items-center gap-6 h-14 px-4 md:px-8 bg-default border-b border-default"
    >
      <NuxtLink to="/" class="h1 text-default hover:text-primary transition-colors shrink-0">
        Checkbot RAG
      </NuxtLink>
      <nav class="flex items-center gap-1" aria-label="Hauptnavigation">
        <NuxtLink
          v-for="link in navLinks"
          :key="link.to"
          :to="link.to"
          class="px-3 py-2 text-sm rounded-md transition-colors"
          :class="
            route.path === link.to || (link.to !== '/import' && route.path.startsWith('/claims'))
              ? 'bg-primary/10 text-primary font-medium'
              : 'text-muted hover:text-default hover:bg-elevated'
          "
        >
          {{ link.label }}
        </NuxtLink>
      </nav>
    </header>
    <main class="flex-1 p-4 md:p-8">
      <NuxtPage />
    </main>
  </div>
</template>
