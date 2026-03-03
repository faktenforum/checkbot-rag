import { ref } from "vue";
import type { ClaimStatus, SearchRequest, SearchResponse, SearchLanguage } from "../types/api";

export function useSearch() {
  const { apiFetch } = useApi();
  const results = ref<SearchResponse | null>(null);
  const pending = ref(false);
  const error = ref<string | null>(null);
  const language = ref<SearchLanguage>("de");
  const enableFts = ref(true);
  const enableVec = ref(true);

  async function search(params: Omit<SearchRequest, "language" | "enableFts" | "enableVec">) {
    if (!params.query.trim()) return;
    pending.value = true;
    error.value = null;
    results.value = null;

    try {
      const body: SearchRequest = {
        ...params,
        language: language.value,
        enableFts: enableFts.value,
        enableVec: enableVec.value,
      };
      // Only include status/internal when they are defined
      if (params.status === undefined) delete body.status;
      if (params.internal === undefined) delete body.internal;

      results.value = await apiFetch<SearchResponse>("/api/v1/search", {
        method: "POST",
        body: JSON.stringify(body satisfies SearchRequest),
      });
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      pending.value = false;
    }
  }

  return { results, pending, error, language, enableFts, enableVec, search };
}
