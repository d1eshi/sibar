import test from "node:test";
import assert from "node:assert/strict";

import { loadRepoInventoryStatus } from "../src/ownershipWorkbench/repoInventoryClient.ts";

const mockInventory = {
  sourceRoot: "src",
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [
    {
      path: "src/App.tsx",
      extension: ".tsx",
      role: "source",
      sizeBytes: 1200,
      lineCount: 34,
      excerpt: "const x = 1;",
    },
  ],
  tree: {
    path: "src",
    kind: "directory",
    fileCount: 1,
    totalSizeBytes: 1200,
    children: [],
  },
};

const incompleteTreeInventory = {
  ...mockInventory,
  tree: {
    path: "src",
    fileCount: 1,
    totalSizeBytes: 1200,
    children: [],
  },
};

const invalidNestedTreeInventory = {
  ...mockInventory,
  tree: {
    path: "src",
    kind: "directory",
    fileCount: 1,
    totalSizeBytes: 1200,
    children: [
      {
        path: "src/App.tsx",
        fileCount: 1,
        totalSizeBytes: 400,
        children: [],
      },
    ],
  },
};

test("loadRepoInventoryStatus fetches repo inventory against browser origin by default", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = (globalThis as { location?: { origin?: string } }).location;

  const calledUrls: string[] = [];
  globalThis.fetch = async (input: RequestInfo | URL, options?: RequestInit) => {
    calledUrls.push(typeof input === "string" ? input : input.toString());
    assert.equal(options?.signal, undefined);
    return {
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => mockInventory,
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
    const status = await loadRepoInventoryStatus();
    assert.equal(status.kind, "ready");
    assert.equal(calledUrls.length, 1);
    assert.equal(calledUrls[0], "http://localhost:5173/__sibi/repo-inventory?sourceRoot=src");
    assert.equal(
      calledUrls[0].startsWith("http://localhost:5173/"),
      true,
      "request must stay relative to current origin, not hardcoded localhost",
    );
  } finally {
    Object.defineProperty(globalThis, "location", {
      configurable: true,
      value: originalLocation,
      writable: true,
    });
    globalThis.fetch = originalFetch;
  }
});

test("loadRepoInventoryStatus returns unavailable when tree payload is invalid", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => incompleteTreeInventory,
    }) as Response;

  try {
    const status = await loadRepoInventoryStatus();
    assert.equal(status.kind, "unavailable");
    assert.equal(status.reason, "inventory endpoint returned an invalid payload");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("loadRepoInventoryStatus validates tree nodes recursively", async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () =>
    ({
      ok: true,
      status: 200,
      statusText: "OK",
      json: async () => invalidNestedTreeInventory,
    }) as Response;

  try {
    const status = await loadRepoInventoryStatus();
    assert.equal(status.kind, "unavailable");
    assert.equal(status.reason, "inventory endpoint returned an invalid payload");
  } finally {
    globalThis.fetch = originalFetch;
  }
});
