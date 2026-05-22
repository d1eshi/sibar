import { randomUUID } from "node:crypto";

export function uniqueId(prefix: string): string {
  return `${prefix}-${randomUUID().slice(0, 8)}`;
}

export function now(): string {
  return new Date().toISOString();
}

export function addDays(timestamp: string, days: number): string {
  return new Date(new Date(timestamp).getTime() + days * 86400000).toISOString();
}
