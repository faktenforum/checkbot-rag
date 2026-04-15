import { defineEventHandler, getRequestIP, setResponseStatus, setResponseHeader } from "h3";
import { promClient } from "../utils/metrics";

// Prometheus scraper endpoint. Bypasses the auth middleware (PUBLIC_PATH),
// protected by an IP allowlist because scrape targets are typically reached
// from inside the cluster.
//
// Allowed IPs via env var CHECKBOT_RAG_METRICS_ALLOWED_IPS, comma-separated.
// Defaults to loopback + private ranges, which matches most docker-compose /
// k8s setups where Prometheus lives on the same network.

// Loopback and RFC 1918 private ranges — matches docker-compose / k8s
// sidecar-scraper setups where Prometheus lives on the same pod network.
const DEFAULT_ALLOWLIST = ["127.0.0.1", "::1", "10.", "172.", "192.168."];

function parseAllowlist(): string[] {
  const raw = process.env.CHECKBOT_RAG_METRICS_ALLOWED_IPS;
  if (!raw) return DEFAULT_ALLOWLIST;
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// Normalize IPv4-mapped-IPv6 addresses (e.g. Node reports "::ffff:127.0.0.1"
// when the server is bound to dual-stack and the peer arrives over IPv4).
function normalizeIp(ip: string): string {
  return ip.startsWith("::ffff:") ? ip.slice(7) : ip;
}

function ipAllowed(ip: string | undefined, allowlist: string[]): boolean {
  if (!ip) return false;
  const normalized = normalizeIp(ip);
  return allowlist.some(
    (prefix) => ip.startsWith(prefix) || normalized.startsWith(prefix)
  );
}

export default defineEventHandler(async (event) => {
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? "";
  const allowlist = parseAllowlist();

  if (!ipAllowed(ip, allowlist)) {
    setResponseStatus(event, 403);
    return { error: "Forbidden" };
  }

  setResponseHeader(event, "Content-Type", promClient.register.contentType);
  return await promClient.register.metrics();
});
