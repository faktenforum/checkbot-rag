interface AuditEntry {
  id: number;
  userId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  metadata: Record<string, unknown>;
  ipAddress: string | null;
  createdAt: string;
}

interface AuditLogListResponse {
  entries: AuditEntry[];
  total: number;
  offset: number;
  limit: number;
}

export function useAuditLog() {
  const { apiFetch } = useApi();

  async function list(opts: {
    userId?: string;
    action?: string;
    targetType?: string;
    from?: string;
    to?: string;
    offset?: number;
    limit?: number;
  } = {}): Promise<AuditLogListResponse> {
    const params = new URLSearchParams();
    if (opts.userId) params.set("userId", opts.userId);
    if (opts.action) params.set("action", opts.action);
    if (opts.targetType) params.set("targetType", opts.targetType);
    if (opts.from) params.set("from", opts.from);
    if (opts.to) params.set("to", opts.to);
    if (opts.offset !== undefined) params.set("offset", String(opts.offset));
    if (opts.limit !== undefined) params.set("limit", String(opts.limit));
    return apiFetch<AuditLogListResponse>(`/api/v1/audit-log?${params}`);
  }

  return { list };
}
