import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  devtools: { enabled: true },

  compatibilityDate: "2025-12-16",

  srcDir: "app",

  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxt/eslint"],

  app: {
    head: {
      link: [
        {
          rel: "icon",
          type: "image/png",
          href: "/favicon/web-app-manifest-192x192.png",
        },
        {
          rel: "apple-touch-icon",
          sizes: "180x180",
          href: "/favicon/apple-touch-icon.png",
        },
        {
          rel: "manifest",
          href: "/favicon/site.webmanifest",
        },
      ],
      meta: [
        {
          name: "theme-color",
          content: "#ffffff",
        },
      ],
    },
  },

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
