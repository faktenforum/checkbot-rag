// Base fetch composable for all API calls to the checkbot-rag backend.
export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase;

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new Error(body?.error ?? `Request failed: ${response.status}`);
    }

    // DELETE endpoints like /import/jobs/:id return 204 No Content.
    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  return { apiFetch };
}
