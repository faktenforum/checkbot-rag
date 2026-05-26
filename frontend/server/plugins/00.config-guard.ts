// Runtime config guardrails. Runs at nitro startup — if required production
// settings are missing, the server refuses to boot rather than silently
// exposing weak defaults.

export default defineNitroPlugin(() => {
  if (process.env.NODE_ENV !== "production") return;

  const publicUrl = process.env.SEARCH_PUBLIC_URL?.trim();
  if (!publicUrl) {
    throw new Error(
      "FATAL: SEARCH_PUBLIC_URL must be set in production — CORS origin cannot default to '*'. " +
        "Set it to the exact public URL of the admin UI (e.g. https://search.example.com)."
    );
  }
});
