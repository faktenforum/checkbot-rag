<script lang="ts" setup>
import { withBase } from "ufo";

// Favicon, apple-touch-icon and web-app manifest live in `public/favicon/`,
// so their URLs must be prefixed with the runtime `app.baseURL` (which can be
// "/" for the default deployment or e.g. "/search/" when the admin UI is
// served behind a path prefix). Building these at runtime avoids hard-coding
// the prefix in `nuxt.config.ts`.
const baseURL = useRuntimeConfig().app.baseURL;

useHead({
  link: [
    {
      rel: "icon",
      type: "image/png",
      href: withBase("/favicon/web-app-manifest-192x192.png", baseURL),
    },
    {
      rel: "apple-touch-icon",
      sizes: "180x180",
      href: withBase("/favicon/apple-touch-icon.png", baseURL),
    },
    {
      rel: "manifest",
      href: withBase("/favicon/site.webmanifest", baseURL),
    },
  ],
});
</script>

<template>
  <UApp>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
  </UApp>
</template>
