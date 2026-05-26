// Base fetch composable for all API calls to the search backend.
export function useApi() {
  const config = useRuntimeConfig();
  const baseUrl = config.public.apiBase;

  // On the server (SSR), forward the incoming request's cookie header so session
  // auth works during server-side rendering. On the client, credentials: "include"
  // lets the browser send the cookie automatically.
  const ssrCookie = import.meta.server ? useRequestHeaders(["cookie"]).cookie : undefined;

  async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    if (ssrCookie) {
      headers["cookie"] = ssrCookie;
    }

    const response = await fetch(`${baseUrl}${path}`, {
      credentials: "include",
      ...options,
      headers,
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
