import promClient, { Counter } from "prom-client";

// Shared default Prometheus registry used by /api/metrics endpoint.
// prom-client de-dupes by name on registration, so calling the module in
// multiple places (hot reload, multiple tests) doesn't throw.

// Collect node-level defaults (memory, cpu, event loop lag) — low-cardinality,
// valuable for capacity planning and detecting hangs.
if (!promClient.register.getSingleMetric("process_cpu_seconds_total")) {
  promClient.collectDefaultMetrics({ prefix: "checkbot_rag_" });
}

function getOrCreate(opts: {
  name: string;
  help: string;
  labelNames: readonly string[];
}): Counter<string> {
  const existing = promClient.register.getSingleMetric(opts.name);
  if (existing instanceof Counter) return existing;
  return new Counter({
    name: opts.name,
    help: opts.help,
    labelNames: opts.labelNames as string[]
  });
}

// POST /api/v1/auth/login outcomes. `rate_limited` distinguishes brute-force
// attempts that never reached AuthService (the pre-auth middleware rejected
// them) from real bad-password tries.
export const loginTotal = getOrCreate({
  name: "checkbot_rag_auth_login_total",
  help: "Login attempts by outcome",
  labelNames: ["result"] as const // 'success' | 'failed' | 'rate_limited'
});

// 05.rate-limit.ts + 035.login-rate-limit.ts rejections. bucket labels allow
// separate alerts for login brute-force vs. normal API throttling.
export const rateLimitRejectedTotal = getOrCreate({
  name: "checkbot_rag_rate_limit_rejected_total",
  help: "Requests rejected by the rate limiter, by bucket",
  labelNames: ["bucket"] as const // 'login_ip' | 'login_email' | 'api' | 'search' | 'import'
});

export { promClient };
