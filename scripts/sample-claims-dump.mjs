#!/usr/bin/env bun
/**
 * Create a shortened claims dump with N entries (default 10) for quick import testing.
 * Usage: bun scripts/sample-claims-dump.mjs <input.json> [output.json] [count]
 * Example: bun scripts/sample-claims-dump.mjs exports/2026-02-18T19-29-23-254Z_claims_dump.json
 */

import { readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const inputPath = process.argv[2];
const outputPath = process.argv[3];
const count = Math.max(0, parseInt(process.argv[4] ?? "10", 10) || 10);

if (!inputPath) {
  console.error("Usage: node scripts/sample-claims-dump.mjs <input.json> [output.json] [count]");
  process.exit(1);
}

const resolvedInput = inputPath.startsWith("/") ? inputPath : join(root, inputPath);
const raw = readFileSync(resolvedInput, "utf8");
const claims = JSON.parse(raw);

if (!Array.isArray(claims)) {
  console.error("Input JSON must be an array of claims.");
  process.exit(1);
}

const sample = claims.slice(0, count);
const out = outputPath
  ? (outputPath.startsWith("/") ? outputPath : join(root, outputPath))
  : join(dirname(resolvedInput), basename(resolvedInput, ".json") + "-sample.json");

writeFileSync(out, JSON.stringify(sample, null, 2), "utf8");
console.log(`Wrote ${sample.length} claims to ${out}`);
