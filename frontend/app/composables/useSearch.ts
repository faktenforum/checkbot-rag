import { ref } from "vue";
import type { SearchRequest, SearchResponse, SearchLanguage } from "../types/api";

export function useSearch() {
  const { apiFetch } = useApi();
  const results = ref<SearchResponse | null>(null);
  const pending = ref(false);
  const error = ref<string | null>(null);
  const language = ref<SearchLanguage>("de");

  async function search(params: Omit<SearchRequest, "language">) {
    if (!params.query.trim()) return;
    pending.value = true;
    error.value = null;
    results.value = null;

    try {
      results.value = await apiFetch<SearchResponse>("/api/v1/search", {
        method: "POST",
        body: JSON.stringify({
          ...params,
          language: language.value,
        } satisfies SearchRequest),
      });
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      pending.value = false;
    }
  }

  return { results, pending, error, language, search };
}
