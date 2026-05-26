import type { User } from "@search/core";

interface UserListResponse {
  users: User[];
  total: number;
  offset: number;
  limit: number;
}

interface CreateUserInput {
  userType: "human" | "service";
  name: string;
  email?: string | null;
  password?: string;
  permissions: string[];
}

interface UpdateUserInput {
  name?: string;
  permissions?: string[];
  active?: boolean;
}

export function useUsers() {
  const { apiFetch } = useApi();

  async function list(opts: { offset?: number; limit?: number; userType?: string; includeInactive?: boolean } = {}): Promise<UserListResponse> {
    const params = new URLSearchParams();
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    if (opts.userType) params.set("userType", opts.userType);
    if (opts.includeInactive) params.set("includeInactive", "true");
    return apiFetch<UserListResponse>(`/api/v1/users?${params}`);
  }

  async function get(id: string): Promise<User> {
    return apiFetch<User>(`/api/v1/users/${id}`);
  }

  async function create(input: CreateUserInput): Promise<User> {
    return apiFetch<User>("/api/v1/users", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  async function update(id: string, patch: UpdateUserInput): Promise<User> {
    return apiFetch<User>(`/api/v1/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
  }

  async function updatePassword(id: string, password: string): Promise<void> {
    return apiFetch<void>(`/api/v1/users/${id}/password`, {
      method: "PUT",
      body: JSON.stringify({ password }),
    });
  }

  async function deactivate(id: string): Promise<void> {
    return apiFetch<void>(`/api/v1/users/${id}/deactivate`, { method: "POST" });
  }

  async function deleteUser(id: string): Promise<void> {
    return apiFetch<void>(`/api/v1/users/${id}`, { method: "DELETE" });
  }

  return { list, get, create, update, updatePassword, deactivate, deleteUser };
}
