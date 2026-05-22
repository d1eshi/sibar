import { createHash } from "node:crypto";
import type { ArtifactGenerationOptions } from "./types.ts";

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => canonicalize(entry));
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const sortedKeys = Object.keys(record).sort();
    const normalized: Record<string, unknown> = {};
    for (const key of sortedKeys) {
      normalized[key] = canonicalize(record[key]);
    }
    return normalized;
  }

  return value;
}

export function deriveDeterministicTimestamp(seed: unknown): string {
  const normalized = canonicalize(seed);
  const serialized = JSON.stringify(normalized);
  const hash = createHash("sha256").update(serialized).digest();
  const offsetSeconds = hash.readUInt32BE(0);

  const baseEpoch = Date.UTC(2020, 0, 1, 0, 0, 0, 0);
  const twentyYearsSeconds = 20 * 365 * 24 * 60 * 60;
  const boundedOffset = offsetSeconds % twentyYearsSeconds;

  return new Date(baseEpoch + boundedOffset * 1000).toISOString();
}

export function resolveCreatedAt(
  options: ArtifactGenerationOptions | undefined,
  seed: unknown,
): string {
  if (options?.createdAt) return options.createdAt;
  if (options?.deterministicClock) return options.deterministicClock(seed);
  return deriveDeterministicTimestamp(seed);
}
