import type { RepoInventory, RepoInventoryStatus } from "./repoInventoryTypes.ts";

const DEFAULT_ENDPOINT = "/__sibi/repo-inventory";

type RepoInventoryRequest = {
  endpoint?: string;
  signal?: AbortSignal;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidTreeNode(value: unknown): value is RepoInventory["tree"] {
  if (!isObject(value)) return false;
  if (
    typeof value.path !== "string" ||
    (value.kind !== "directory" && value.kind !== "file") ||
    !isValidNumber(value.fileCount) ||
    !isValidNumber(value.totalSizeBytes)
  ) {
    return false;
  }

  if (value.children == null) return true;
  if (!Array.isArray(value.children)) return false;
  return value.children.every(isValidTreeNode);
}

function isValidFile(value: unknown): value is RepoInventory["files"][number] {
  if (!isObject(value)) return false;
  return (
    typeof value.path === "string" &&
    typeof value.extension === "string" &&
    isValidNumber(value.sizeBytes) &&
    isValidNumber(value.lineCount) &&
    ["source", "test", "doc", "config", "unknown"].includes(String(value.role)) &&
    typeof value.excerpt === "string"
  );
}

function isValidInventory(value: unknown): value is RepoInventory {
  if (!isObject(value)) return false;
  if (typeof value.sourceRoot !== "string" || typeof value.generatedAt !== "string") return false;
  if (!Array.isArray(value.files) || !isValidTreeNode(value.tree)) return false;
  return value.files.every(isValidFile);
}

export async function loadRepoInventoryStatus(
  sourceRoot = "src",
  options: RepoInventoryRequest = {},
): Promise<RepoInventoryStatus> {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const isAbsoluteEndpoint = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(endpoint);
  const hasOrigin =
    typeof globalThis.location === "object" &&
    globalThis.location !== null &&
    typeof globalThis.location.origin === "string";

  const requestUrl = hasOrigin
    ? new URL(endpoint, globalThis.location.origin)
    : isAbsoluteEndpoint
      ? new URL(endpoint)
      : new URL(`${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, "http://127.0.0.1");

  requestUrl.searchParams.set("sourceRoot", sourceRoot);

  try {
    const requestInput = hasOrigin || isAbsoluteEndpoint ? requestUrl.toString() : `${requestUrl.pathname}${requestUrl.search}`;
    const response = await fetch(requestInput, { signal: options.signal });
    if (!response.ok) {
      return {
        kind: "unavailable",
        reason: `inventory endpoint returned ${response.status}: ${response.statusText}`,
      };
    }

    const payload = await response.json();
    if (!isValidInventory(payload)) {
      return {
        kind: "unavailable",
        reason: "inventory endpoint returned an invalid payload",
      };
    }

    return { kind: "ready", inventory: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        kind: "loading",
      };
    }

    return {
      kind: "unavailable",
      reason: error instanceof Error ? error.message : "inventory request failed",
    };
  }
}
