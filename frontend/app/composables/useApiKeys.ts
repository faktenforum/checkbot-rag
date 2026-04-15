import type { ApiKey } from "@checkbot/core";

interface ApiKeyListResponse {
  keys: ApiKey[];
  total: number;
  offset: number;
  limit: number;
}

interface CreateApiKeyInput {
  userId: string;
  name: string;
  description?: string | null;
  permissions: string[];
  rateLimitPoints?: number | null;
  rateLimitDurationSec?: number;
  expiresAt?: string | null;
}

interface UpdateApiKeyInput {
  name?: string;
  description?: string | null;
  permissions?: string[];
  rateLimitPoints?: number | null;
  rateLimitDurationSec?: number;
  expiresAt?: string | null;
  active?: boolean;
}

interface CreateResult {
  record: ApiKey;
  rawKey: string;
}

export function useApiKeys() {
  const { apiFetch } = useApi();

  async function list(opts: { offset?: number; limit?: number; userId?: string; includeInactive?: boolean } = {}): Promise<ApiKeyListResponse> {
    const params = new URLSearchParams();
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.userId) params.set("userId", opts.userId);
    if (opts.includeInactive) params.set("includeInactive", "true");
    return apiFetch<ApiKeyListResponse>(`/api/v1/api-keys?${params}`);
  }

  async function get(id: string): Promise<ApiKey> {
    return apiFetch<ApiKey>(`/api/v1/api-keys/${id}`);
  }

  async function create(input: CreateApiKeyInput): Promise<CreateResult> {
    return apiFetch<CreateResult>("/api/v1/api-keys", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async function update(id: string, patch: UpdateApiKeyInput): Promise<ApiKey> {
    return apiFetch<ApiKey>(`/api/v1/api-keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async function revoke(id: string): Promise<void> {
    return apiFetch<void>(`/api/v1/api-keys/${id}/revoke`, { method: "POST" });
  }

  async function deleteKey(id: string): Promise<void> {
    return apiFetch<void>(`/api/v1/api-keys/${id}`, { method: "DELETE" });
  }

  return { list, get, create, update, revoke, deleteKey };
}
