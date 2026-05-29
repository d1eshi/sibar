const DEFAULT_ENDPOINT = "/__sibi/repo-search";

export type RepoSearchMatch = {
  path: string;
  line: number;
  excerpt: string;
  query: string;
};

export type RepoSearchPayload = {
  sourceRoot: string;
  query: string;
  results: RepoSearchMatch[];
};

export type RepoSearchStatus =
  | {
      kind: "ready";
      search: RepoSearchPayload;
    }
  | {
      kind: "unavailable";
      reason: string;
    }
  | {
      kind: "loading";
    };

export type RepoSearchRequest = {
  endpoint?: string;
  sourceRoot?: string;
  signal?: AbortSignal;
};

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value != null;
}

function isPositiveLine(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function isValidRepoSearchMatch(value: unknown): value is RepoSearchMatch {
  if (!isObject(value)) return false;
  return (
    typeof value.path === "string" &&
    isPositiveLine(value.line) &&
    typeof value.excerpt === "string" &&
    typeof value.query === "string"
  );
}

function isValidRepoSearchPayload(value: unknown): value is RepoSearchPayload {
  if (!isObject(value)) return false;
  return (
    typeof value.sourceRoot === "string" &&
    typeof value.query === "string" &&
    Array.isArray(value.results) &&
    value.results.every(isValidRepoSearchMatch)
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

export async function loadRepoSearchStatus(
  query: string,
  options: RepoSearchRequest = {},
): Promise<RepoSearchStatus> {
  const endpoint = options.endpoint ?? DEFAULT_ENDPOINT;
  const sourceRoot = String(options.sourceRoot ?? "src");
  const requestUrl = hasBrowserOrigin()
    ? new URL(endpoint, globalThis.location.origin)
    : isAbsoluteEndpoint(endpoint)
      ? new URL(endpoint)
      : new URL(`${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`, "http://127.0.0.1");

  requestUrl.searchParams.set("sourceRoot", sourceRoot);
  requestUrl.searchParams.set("query", query);

  try {
    const requestInput = hasBrowserOrigin() || isAbsoluteEndpoint(endpoint) ? requestUrl.toString() : `${requestUrl.pathname}${requestUrl.search}`;
    const response = await fetch(requestInput, { signal: options.signal });
    if (!response.ok) {
      return {
        kind: "unavailable",
        reason: `repo-search endpoint returned ${response.status}: ${response.statusText}`,
      };
    }

    const payload = await response.json();
    if (!isValidRepoSearchPayload(payload)) {
      return {
        kind: "unavailable",
        reason: "repo-search endpoint returned an invalid payload",
      };
    }

    return { kind: "ready", search: payload };
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      return { kind: "loading" };
    }

    return {
      kind: "unavailable",
      reason: error instanceof Error ? error.message : "repo-search request failed",
    };
  }
}
