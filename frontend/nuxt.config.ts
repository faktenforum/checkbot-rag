import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: { enabled: true },

  compatibilityDate: "2025-12-16",

  srcDir: "app",

  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxt/eslint"],

  runtimeConfig: {
    public: {
      // Empty = same-origin (recommended when UI is served from same host). For local dev: NUXT_PUBLIC_API_BASE=http://localhost:3020
      apiBase: "",
    },
  },

  ui: {
    fonts: false,
    theme: {
      colors: ["primary", "secondary", "tertiary", "info", "success", "warning", "error", "neutral"],
    },
  },

  vite: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    plugins: [tailwindcss() as any],
  },

  css: ["~/assets/css/main.css"],

  imports: {
    dirs: ["composables/**"],
  },
});
