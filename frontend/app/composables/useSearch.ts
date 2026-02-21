import { ref } from "vue";
import type { SearchResponse } from "../types/api";

export function useSearch() {
  const { apiFetch } = useApi();
  const results = ref<SearchResponse | null>(null);
  const pending = ref(false);
  const error = ref<string | null>(null);

  async function search(params: {
    query: string;
    limit?: number;
    categories?: string[];
    ratingLabel?: string;
    chunkType?: "all" | "overview" | "fact_detail";
  }) {
    if (!params.query.trim()) return;
    pending.value = true;
    error.value = null;
    results.value = null;

    try {
      results.value = await apiFetch<SearchResponse>("/api/v1/search", {
        method: "POST",
        body: JSON.stringify(params),
      });
    } catch (err) {
      error.value = (err as Error).message;
    } finally {
      pending.value = false;
    }
  }

  return { results, pending, error, search };
}
