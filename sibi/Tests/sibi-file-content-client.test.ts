import test from "node:test";
import assert from "node:assert/strict";

import { loadFileContentStatus } from "../src/ownershipWorkbench/fileContentClient.ts";

const mockFile = {
  sourceRoot: "src",
  path: "src/api/session.ts",
  contents: "export const x = 1;\n",
  lineCount: 1,
  sizeBytes: 17,
};

const mockFileWithGeneratedAt = {
  ...mockFile,
  generatedAt: "2026-01-01T00:00:00.000Z",
};

const invalidPayload = {
  sourceRoot: "src",
  path: "src/api/session.ts",
  contents: "export const x = 1;\n",
  lineCount: -1,
  sizeBytes: 10,
};

test("loadFileContentStatus builds browser-origin URL with sourceRoot/path query params", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;
  const controller = new AbortController();

  const calledUrls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, options?: RequestInit) => {
    calledUrls.push(typeof input === "string" ? input : input.toString());
    assert.equal(options?.signal, controller.signal);
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => mockFile,
    } as Response;
  };

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      origin: "http://localhost:5173",
    },
    writable: true,
  });

  try {
    const status = await loadFileContentStatus("src/api/session.ts", {
      sourceRoot: "src",
      signal: controller.signal,
    });
    assert.equal(status.kind, "ready");
    assert.equal(calledUrls.length, 1);
    assert.equal(calledUrls[0], "http://localhost:5173/__sibi/file-content?sourceRoot=src&path=src%2Fapi%2Fsession.ts");
    assert.equal(
      calledUrls[0].startsWith("http://localhost:5173/__sibi/file-content"),
      true,
      "request should stay relative to current origin",
    );
    assert.equal(status.file.lineCount, 1);
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("loadFileContentStatus forwards signal from third options arg when sourceRoot is positional", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;
  const controller = new AbortController();

  let calledSignal: AbortSignal | undefined;
  globalThis.fetch = async (_input: RequestInfo | URL, options?: RequestInit) => {
    calledSignal = options?.signal;
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => mockFile,
    } as Response;
  };

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      origin: "http://localhost:5173",
    },
    writable: true,
  });

  try {
    const status = await loadFileContentStatus("src/api/session.ts", "src", {
      signal: controller.signal,
    });
    assert.equal(status.kind, "ready");
    assert.equal(calledSignal, controller.signal);
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("loadFileContentStatus accepts optional generatedAt and validates payload shape", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;

  const responses: Array<{ status: number; payload: unknown; statusText: string }> = [
    { status: 200, statusText: "OK", payload: mockFileWithGeneratedAt },
    { status: 200, statusText: "OK", payload: invalidPayload },
  ];
  let callIndex = 0;

  globalThis.fetch = async (_requestInput: RequestInfo | URL) => {
    const current = responses[callIndex];
    callIndex += 1;
    return {
      ok: true,
      status: current.status,
      statusText: current.statusText,
      json: async () => current.payload,
    } as Response;
  };

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      origin: "http://127.0.0.1:4173",
    },
    writable: true,
  });

  try {
    const first = await loadFileContentStatus("src/api/session.ts", "fixture");
    assert.equal(first.kind, "ready");
    assert.equal(first.kind === "ready" ? first.file.generatedAt : null, mockFileWithGeneratedAt.generatedAt);

    const second = await loadFileContentStatus("src/api/session.ts");
    assert.equal(second.kind, "unavailable");
    assert.equal(second.reason, "file content endpoint returned an invalid payload");
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("loadFileContentStatus reports unavailable when endpoint returns 404", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () =>
    ({
      ok: false,
      status: 404,
      statusText: "Not Found",
    }) as Response;

  try {
    const status = await loadFileContentStatus("src/api/missing.ts");
    assert.equal(status.kind, "unavailable");
    assert.equal(status.reason, "file content endpoint returned 404: Not Found");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadFileContentStatus returns loading when request is aborted", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;
  const controller = new AbortController();

  globalThis.fetch = async () => {
    throw new DOMException("Aborted", "AbortError");
  };

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: {
      origin: "http://localhost:5173",
    },
    writable: true,
  });

  try {
    const status = await loadFileContentStatus("src/api/session.ts", {
      signal: controller.signal,
    });
    assert.equal(status.kind, "loading");
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});
