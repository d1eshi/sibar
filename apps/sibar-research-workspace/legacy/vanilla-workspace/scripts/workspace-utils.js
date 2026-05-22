import { DEFAULT_EVIDENCE_CHECKLIST } from "./workspace-data.js";

export function normalizeText(value) {
  return (value || "").toLowerCase().trim();
}

export function normalizeId(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function dedupe(values) {
  const seen = new Set();
  return values.filter((value) => {
    if (seen.has(value)) return false;
    seen.add(value);
    return true;
  });
}

export function formatAttempt(entry, index) {
  return `Attempt ${index + 1}: ${entry.slice(0, 110)}${entry.length > 110 ? "..." : ""}`;
}

export function formatJson(value) {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "{}";
  }
}

export function titleFromSource(sourceText) {
  const clean = (sourceText || "").trim();
  if (!clean) return "Source card: no input yet";
  const firstLine = clean.replace(/\s+/g, " ").split(" ").slice(0, 8).join(" ");
  return `Source card: ${firstLine}`;
}

export function roadmapDeltas(before, after) {
  const map = new Map(before.map((node) => [node.id, node.status]));
  return after
    .map((node) => ({ id: node.id, title: node.title, from: map.get(node.id) || "unseen", to: node.status }))
    .filter((item) => item.from !== item.to);
}

export function createInitialChecklist() {
  return DEFAULT_EVIDENCE_CHECKLIST.map((item) => ({ ...item }));
}
