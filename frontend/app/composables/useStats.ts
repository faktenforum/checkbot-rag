import { useQuery } from "@tanstack/vue-query";
import type { StatsResponse } from "../types/api";

export function useStats() {
  const { apiFetch } = useApi();

  return useQuery<StatsResponse>({
    queryKey: ["stats"],
    queryFn: () => apiFetch<StatsResponse>("/api/v1/stats"),
    staleTime: 30_000,
  });
}
