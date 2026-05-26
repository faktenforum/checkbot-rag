import type { User } from "@search/core";

// Shared reactive user state across the app
const currentUser = ref<User | null | undefined>(undefined);

export function useAuth() {
  const { apiFetch } = useApi();
  const router = useRouter();

  async function fetchMe(): Promise<User | null> {
    try {
      const data = await apiFetch<{ user: User }>("/api/v1/auth/me");
      currentUser.value = data.user;
      return data.user;
    } catch {
      currentUser.value = null;
      return null;
    }
  }

  async function login(email: string, password: string): Promise<void> {
    const data = await apiFetch<{ user: User }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    currentUser.value = data.user;
  }

  async function logout(): Promise<void> {
    try {
      await apiFetch("/api/v1/auth/logout", { method: "POST" });
    } finally {
      currentUser.value = null;
      router.push("/login");
    }
  }

  function hasPermission(required: string): boolean {
    if (!currentUser.value) return false;
    const perms = currentUser.value.permissions;
    return perms.includes("admin") || perms.includes(required);
  }

  return { currentUser: readonly(currentUser), fetchMe, login, logout, hasPermission };
}
