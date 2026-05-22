import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  classifyRepoInventoryRole,
  DETERMINISTIC_GENERATED_AT,
  repoInventory,
} from "../../src/repo-inventory/repo-inventory.js";

const THIS_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_ROOT = join(THIS_DIR, "..", "src");

function findNode(node, targetPath) {
  if (node.path === targetPath) {
    return node;
  }

  const nextNodes = node.children ?? [];
  for (const child of nextNodes) {
    const found = findNode(child, targetPath);
    if (found != null) {
      return found;
    }
  }

  return null;
}

function compareInventoryPath(left, right) {
  if (left === right) {
    return 0;
  }

  return left < right ? -1 : 1;
}

function isSortedInventoryLexicographically(values) {
  const sorted = [...values].sort(compareInventoryPath);
  return values.every((value, index) => value === sorted[index]);
}

function totalSizeBytes(inventory) {
  return inventory.files.reduce((sum, file) => sum + file.sizeBytes, 0);
}

test("repoInventory for src is deterministic and normalized", async () => {
  const generatedAt = "2026-01-01T00:00:00.000Z";
  const first = await repoInventory(SOURCE_ROOT, {
    generatedAt,
    sourceRootLabel: "src",
  });
  const second = await repoInventory(SOURCE_ROOT, {
    generatedAt,
    sourceRootLabel: "src",
  });

  assert.equal(first.generatedAt, generatedAt);
  assert.equal(first.sourceRoot, "src");
  assert.equal(first.tree.path, "src");
  assert.equal(first.files.every((entry) => entry.path.startsWith("src/")), true, "all src inventory files must be under src/");
  assert.ok(isSortedInventoryLexicographically(first.files.map((entry) => entry.path)));
  assert.equal(first.tree.children?.some((entry) => entry.path === first.tree.path), false);
  assert.equal(findNode(first.tree, "src/App.tsx") != null, true);
  assert.equal(findNode(first.tree, "src/ownershipWorkbench")?.kind, "directory");
  assert.equal(first.tree.fileCount, first.files.length);
  assert.equal(first.tree.totalSizeBytes, totalSizeBytes(first));
  assert.deepEqual(first, second);

  for (const file of first.files) {
    assert.equal(typeof file.path, "string");
    assert.equal(file.path.includes("\\"), false, `unexpected windows path: ${file.path}`);
    assert.equal(typeof file.extension, "string");
    assert.equal(file.extension === file.extension.toLowerCase(), true);
    assert.equal(typeof file.sizeBytes, "number");
    assert.equal(typeof file.lineCount, "number");
    assert.equal(file.lineCount >= 0, true);
    assert.equal(typeof file.excerpt, "string");
    assert.equal(file.excerpt.length <= 360, true);
  }
});

test("repoInventory skip list blocks build outputs and cache directories", async () => {
  const fixtureRoot = await mkdtemp(join(os.tmpdir(), "sibi-inventory-runtime-"));
  try {
    await mkdir(join(fixtureRoot, "node_modules"), { recursive: true });
    await mkdir(join(fixtureRoot, ".git"), { recursive: true });
    await mkdir(join(fixtureRoot, "coverage"), { recursive: true });
    await mkdir(join(fixtureRoot, "dist"), { recursive: true });
    await mkdir(join(fixtureRoot, "build"), { recursive: true });
    await mkdir(join(fixtureRoot, ".cache"), { recursive: true });
    await mkdir(join(fixtureRoot, "keep"), { recursive: true });
    await mkdir(join(fixtureRoot, "keep", "nested"), { recursive: true });

    await writeFile(join(fixtureRoot, "keep", "keep.ts"), "export const one = 1;\n");
    await writeFile(join(fixtureRoot, "keep", "nested", "notes.md"), "# docs\\n");
    await writeFile(join(fixtureRoot, "keep", "ignore.js"), "const skip = true;\n");
    await writeFile(join(fixtureRoot, ".git", "config"), "{}");
    await writeFile(join(fixtureRoot, "node_modules", "pkg.js"), "const shouldSkip = true;\n");
    await writeFile(join(fixtureRoot, "coverage", "index.html"), "<html></html>");
    await writeFile(join(fixtureRoot, "dist", "index.js"), "console.log('skip')");
    await writeFile(join(fixtureRoot, "build", "bundle.js"), "console.log('skip')");
    await writeFile(join(fixtureRoot, ".cache", "file"), "skip");

    const inventory = await repoInventory(fixtureRoot, {
      sourceRootLabel: "fixture",
      generatedAt: DETERMINISTIC_GENERATED_AT,
    });

    assert.equal(
      inventory.files.some((entry) => entry.path === "fixture/node_modules/pkg.js"),
      false,
      "node_modules file must be skipped",
    );
    assert.equal(
      inventory.files.some((entry) => entry.path === "fixture/.git/config"),
      false,
      "git config must be skipped",
    );
    assert.equal(
      inventory.files.some((entry) => entry.path === "fixture/coverage/index.html"),
      false,
      "coverage output must be skipped",
    );
    assert.equal(
      inventory.files.some((entry) => entry.path === "fixture/dist/index.js"),
      false,
      "dist output must be skipped",
    );
    assert.equal(
      inventory.files.some((entry) => entry.path === "fixture/build/bundle.js"),
      false,
      "build output must be skipped",
    );
    assert.equal(
      inventory.files.some((entry) => entry.path === "fixture/.cache/file"),
      false,
      "cache files must be skipped",
    );

    assert.deepEqual(
      inventory.files.map((entry) => entry.path).sort(),
      ["fixture/keep/keep.ts", "fixture/keep/nested/notes.md", "fixture/keep/ignore.js"].sort(),
    );

    const rootNode = findNode(inventory.tree, "fixture");
    assert.equal(rootNode.fileCount, inventory.files.length);
    assert.equal(rootNode.totalSizeBytes, totalSizeBytes(inventory));
    assert.equal(rootNode.children?.some((entry) => entry.path === rootNode.path), false);
    assert.equal(rootNode.children?.some((entry) => entry.path === "fixture/keep"), true);

    const nestedNode = findNode(inventory.tree, "fixture/keep/nested");
    assert.equal(nestedNode.fileCount, 1);
    assert.equal(nestedNode.children?.[0]?.path, "fixture/keep/nested/notes.md");
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("repoInventory uses deterministic ordinal ordering for mixed filenames", async () => {
  const fixtureRoot = await mkdtemp(join(os.tmpdir(), "sibi-inventory-ordering-"));
  try {
    const fixture = join(fixtureRoot, "fixture");
    await mkdir(fixture, { recursive: true });

    const names = ["A.ts", "_a.ts", "9.ts"];
    for (const name of names) {
      await writeFile(join(fixture, name), "export const value = 1;\n");
    }

    const inventory = await repoInventory(fixture, {
      sourceRootLabel: "fixture",
      generatedAt: DETERMINISTIC_GENERATED_AT,
    });

    const filePaths = inventory.files.map((entry) => entry.path);
    const expectedOrder = ["fixture/9.ts", "fixture/A.ts", "fixture/_a.ts"];

    assert.equal(isSortedInventoryLexicographically(filePaths), true);
    assert.deepEqual(filePaths, expectedOrder);
    assert.deepEqual(filePaths, [...expectedOrder].sort(compareInventoryPath));
  } finally {
    await rm(fixtureRoot, { force: true, recursive: true });
  }
});

test("classifyRepoInventoryRole classifies tests/docs/config/source/unknown", () => {
  assert.equal(classifyRepoInventoryRole("src/api/session.test.ts"), "test");
  assert.equal(classifyRepoInventoryRole("src/api/session.spec.tsx"), "test");
  assert.equal(classifyRepoInventoryRole("docs/guide.md"), "doc");
  assert.equal(classifyRepoInventoryRole("README.md"), "doc");
  assert.equal(classifyRepoInventoryRole("vite.config.js"), "config");
  assert.equal(classifyRepoInventoryRole("src/ownershipWorkbench/App.tsx"), "source");
  assert.equal(classifyRepoInventoryRole("src/ownershipWorkbench/logo.ico"), "unknown");
});
