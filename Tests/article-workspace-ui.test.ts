import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "docs/demo/article-workspace.html"), "utf8");

test("article workspace exposes tab-style note kind controls", () => {
  assert.match(html, /role="tablist" aria-label="Tipo de nota"/);
  assert.match(html, /role="tab" aria-selected="true" data-kind="highlight"/);
  assert.match(html, /role="tab" aria-selected="false" data-kind="question"/);
  assert.match(html, /role="tab" aria-selected="false" data-kind="key"/);
});

test("article workspace wires keyboard shortcuts for pending note capture", () => {
  assert.match(html, /const KIND_ORDER = \["highlight", "question", "key"\]/);
  assert.match(html, /pendingSelection && event\.key === "Tab"/);
  assert.match(html, /cyclePendingKind\(event\.shiftKey \? -1 : 1\)/);
  assert.match(html, /event\.key === "Enter" && \(event\.metaKey \|\| event\.ctrlKey\)/);
  assert.match(html, /savePending\(\)/);
});
