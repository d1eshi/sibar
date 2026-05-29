import test from "node:test";
import assert from "node:assert/strict";

import { projectWorkbenchDataset } from "../src/ownershipWorkbench/workbenchDataset.ts";
import type { RepoInventory } from "../src/ownershipWorkbench/repoInventoryTypes.ts";

const inventory: RepoInventory = {
  sourceRoot: "src",
  generatedAt: "2026-01-01T00:00:00.000Z",
  files: [
    {
      path: "src/api/session.ts",
      extension: ".ts",
      role: "source",
      sizeBytes: 120,
      lineCount: 8,
      excerpt: "export function createSession() {}",
    },
    {
      path: "src/api/session.test.ts",
      extension: ".ts",
      role: "test",
      sizeBytes: 80,
      lineCount: 4,
      excerpt: "test('createSession', () => {})",
    },
    {
      path: "src/ui/App.tsx",
      extension: ".tsx",
      role: "source",
      sizeBytes: 200,
      lineCount: 12,
      excerpt: "export function App() {}",
    },
    {
      path: "docs/session.md",
      extension: ".md",
      role: "doc",
      sizeBytes: 50,
      lineCount: 3,
      excerpt: "# Session",
    },
  ],
  tree: {
    path: "src",
    kind: "directory",
    fileCount: 3,
    totalSizeBytes: 400,
    children: [],
  },
};

test("projectWorkbenchDataset projects inventory files into FileTreePanel inputs", () => {
  const dataset = projectWorkbenchDataset({
    inventory,
    repoSearches: [
      {
        sourceRoot: "src",
        query: "createSession",
        results: [
          {
            path: "src/api/session.ts",
            line: 1,
            excerpt: "export function createSession() {}",
            query: "createSession",
          },
          {
            path: "docs/session.md",
            line: 1,
            excerpt: "# Session",
            query: "createSession",
          },
        ],
      },
    ],
    selectedSourceRoot: "src/api",
    selectedPath: "src/api/session.test.ts",
  });

  assert.equal(dataset.schema, "sibi-workbench-dataset.v1");
  assert.equal(dataset.mode, "live");
  assert.equal(dataset.sourceRoot, "src/api");
  assert.deepEqual(dataset.fileTreePaths, ["src/api/session.test.ts", "src/api/session.ts"]);
  assert.deepEqual(dataset.repoSearch, [
    {
      query: "createSession",
      matches: [
        {
          path: "src/api/session.ts",
          line: 1,
          excerpt: "export function createSession() {}",
          evidenceId: "src/api/session.ts:1-1:repo-search:createSession",
        },
      ],
    },
  ]);
  assert.equal(dataset.diagnostics.some((entry) => entry.code === "repo_search_out_of_inventory"), true);
  assert.equal(dataset.selectedPath, "src/api/session.test.ts");
  assert.deepEqual(Object.keys(dataset.fileStates).sort(), dataset.fileTreePaths);
  assert.equal(dataset.fileStates["src/api/session.ts"], "unvisited");
  assert.equal(dataset.fileTreeNodeByPath["src/api"]?.kind, "directory");
  assert.equal(dataset.fileTreeNodeByPath["src/api/session.ts"]?.kind, "file");
  assert.equal(dataset.fileTreeNodeByPath["src/ui/App.tsx"], undefined);
  assert.equal(dataset.fileTreeNodeByPath["docs/session.md"], undefined);
  assert.match(dataset.fileStateReasons["src/api/session.ts"] ?? "", /source file, 8 lines/);
});

test("projectWorkbenchDataset falls back to first projected file when selection is outside root", () => {
  const dataset = projectWorkbenchDataset({
    inventory,
    selectedSourceRoot: "src/api",
    selectedPath: "src/ui/App.tsx",
  });

  assert.equal(dataset.selectedPath, "src/api/session.test.ts");
});

test("projectWorkbenchDataset collapses safe dot segments and rejects parent traversal", () => {
  const dataset = projectWorkbenchDataset({
    inventory: {
      ...inventory,
      files: [
        ...inventory.files,
        {
          path: "src/api/../ui/Widget.tsx",
          extension: ".tsx",
          role: "source",
          sizeBytes: 70,
          lineCount: 2,
          excerpt: "export function Widget() {}",
        },
        {
          path: "../outside.ts",
          extension: ".ts",
          role: "source",
          sizeBytes: 10,
          lineCount: 1,
          excerpt: "outside",
        },
      ],
    },
    selectedSourceRoot: "src/./ui",
    selectedPath: "src/api/../ui/Widget.tsx",
  });

  assert.equal(dataset.sourceRoot, "src/ui");
  assert.deepEqual(dataset.fileTreePaths, ["src/ui/App.tsx", "src/ui/Widget.tsx"]);
  assert.equal(dataset.selectedPath, "src/ui/Widget.tsx");
  assert.equal(dataset.fileTreeNodeByPath["outside.ts"], undefined);
});

test("projectWorkbenchDataset falls back to inventory root when source root traverses above repo", () => {
  const dataset = projectWorkbenchDataset({
    inventory,
    selectedSourceRoot: "../src/api",
    selectedPath: "../src/api/session.ts",
  });

  assert.equal(dataset.sourceRoot, "src");
  assert.equal(dataset.selectedPath, "src/api/session.test.ts");
});
