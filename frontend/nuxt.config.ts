import tailwindcss from "@tailwindcss/vite";

// CORS origin. In dev we fall back to "*"; in production the server-startup
// plugin (server/plugins/00.config-guard.ts) refuses to boot without
// SEARCH_PUBLIC_URL set, so reaching runtime with "*" here is impossible.
const corsOrigin = process.env.SEARCH_PUBLIC_URL?.trim() || "*";

export default defineNuxtConfig({
  devtools: { enabled: true },

  compatibilityDate: "2025-12-16",

  srcDir: "app",

  modules: ["@nuxt/ui", "@pinia/nuxt", "@nuxt/eslint", "@nuxtjs/i18n", "nuxt-security"],

  // Defense-in-depth headers on top of the hand-rolled auth in core/. CSRF is
  // not enabled here: all protected endpoints accept Bearer tokens (no cookies
  // → CSRF not applicable) and session-based admin UI calls are constrained by
  // SameSite=strict cookies set in AuthService.
  security: {
    // Our core has its own rate-limiter (services/RateLimiterService.ts) with
    // per-user + per-api-key buckets. Disable the lruCache one to avoid double
    // counting.
    rateLimiter: false,
    // We don't run untrusted user forms; disable to prevent false positives on
    // admin UI POSTs that legitimately include HTML in audit-log metadata.
    xssValidator: false,
    // Reject oversized bodies. 10 MB covers the largest legitimate request
    // (a 500-claim import batch, ~2-5 KB/claim) with headroom. Anything beyond
    // is either a bug or an attempt to exhaust memory.
    requestSizeLimiter: {
      maxRequestSizeInBytes: 10_000_000,
      maxUploadFileRequestInBytes: 10_000_000,
      throwError: true,
    },
    // Only allow the HTTP methods we actually use. Blocks drive-by scanners
    // probing TRACE/CONNECT/OPTIONS-only endpoints.
    allowedMethodsRestricter: {
      methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      throwError: true,
    },
    corsHandler: {
      origin: corsOrigin,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"],
      preflight: { statusCode: 204 },
    },
    headers: {
      // Admin UI is served from the same origin; never embedded elsewhere.
      xFrameOptions: "DENY",
      strictTransportSecurity: {
        maxAge: 15552000,
        includeSubdomains: true,
      },
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        fullscreen: [],
        "display-capture": [],
      },
    },
  },

  i18n: {
    locales: [
      { code: "de", file: "de.json", name: "Deutsch" },
      { code: "en", file: "en.json", name: "English" },
    ],
    defaultLocale: "en",
    langDir: "locales",
    strategy: "no_prefix",
    detectBrowserLanguage: {
      useCookie: true,
      cookieKey: "i18n_redirected",
      redirectOn: "root",
    },
  },

  app: {
    head: {
      // Favicon + manifest links are injected at runtime in `app/app.vue` so
      // they pick up the current `app.baseURL` (defaults to `/`, but can be
      // `/search/` when the admin UI is served under a path prefix).
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
  devServer: {
    port: process.env.SEARCH_PORT ? Number(process.env.SEARCH_PORT) : 3020,
  },
  nitro: {
    routeRules: {
      "/api/v1/**": { cors: true },
      "/health": { cors: true },
      "/mcp": { cors: true },
    },
  }
});
