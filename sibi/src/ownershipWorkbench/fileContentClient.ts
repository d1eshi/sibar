const DEFAULT_ENDPOINT = "/__sibi/file-content";

export type FileContent = {
  sourceRoot: string;
  path: string;
  contents: string;
  lineCount: number;
  sizeBytes: number;
  generatedAt?: string;
};

export type FileContentStatus =
  | {
      kind: "ready";
      file: FileContent;
    }
  | {
      kind: "unavailable";
      reason: string;
    }
  | {
      kind: "loading";
    };

export type FileContentRequest = {
  endpoint?: string;
  sourceRoot?: string;
  signal?: AbortSignal;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function isValidNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isValidFileContent(value: unknown): value is FileContent {
  if (!isObject(value)) return false;
  return (
    typeof value.sourceRoot === "string" &&
    typeof value.path === "string" &&
    typeof value.contents === "string" &&
    isValidNumber(value.lineCount) &&
    isValidNumber(value.sizeBytes) &&
    (!("generatedAt" in value) || value.generatedAt == null || typeof value.generatedAt === "string")
  );
}

function isAbsoluteEndpoint(endpoint: string): boolean {
  return /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(endpoint);
}

function hasBrowserOrigin(): boolean {
  return (
    typeof globalThis.location === "object" &&
    globalThis.location !== null &&
    typeof globalThis.location.origin === "string"
  );
}

export async function loadFileContentStatus(
  path: string,
  sourceRootOrOptions: string | FileContentRequest = "src",
  options: FileContentRequest = {},
): Promise<FileContentStatus> {
  const normalizedOptions =
    typeof sourceRootOrOptions === "string"
      ? { sourceRoot: sourceRootOrOptions, ...options }
      : { ...sourceRootOrOptions, ...options };

  const sourceRoot = String(normalizedOptions.sourceRoot ?? "src");
  const endpoint = normalizedOptions.endpoint ?? DEFAULT_ENDPOINT;
  const rawPath = String(path ?? "").trim();
  const requestUrl = hasBrowserOrigin()
    ? new URL(endpoint, globalThis.location.origin)
    : isAbsoluteEndpoint(endpoint)
      ? new URL(endpoint)
      : new URL(`${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, "http://127.0.0.1");

  requestUrl.searchParams.set("sourceRoot", sourceRoot);
  requestUrl.searchParams.set("path", rawPath);

  try {
    const requestInput = hasBrowserOrigin() || isAbsoluteEndpoint(endpoint) ? requestUrl.toString() : `${requestUrl.pathname}${requestUrl.search}`;
    const response = await fetch(requestInput, { signal: normalizedOptions.signal });
    if (!response.ok) {
      return {
        kind: "unavailable",
        reason: `file content endpoint returned ${response.status}: ${response.statusText}`,
      };
    }

    const payload = await response.json();
    if (!isValidFileContent(payload)) {
      return {
        kind: "unavailable",
        reason: "file content endpoint returned an invalid payload",
      };
    }

    return { kind: "ready", file: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return {
        kind: "loading",
      };
    }

    return {
      kind: "unavailable",
      reason: error instanceof Error ? error.message : "file content request failed",
    };
  }
}
