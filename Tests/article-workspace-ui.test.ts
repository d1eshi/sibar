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

test("article workspace opens duplicate URLs from local storage before fetching", () => {
  assert.match(html, /function normalizeArticleUrl\(rawUrl\)/);
  assert.match(html, /function getSavedWorkspaceByUrl\(url\)/);
  assert.match(html, /Ya estaba guardado\. Abrimos la copia local sin pedirlo al servidor\./);
  assert.match(html, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
});

test("article workspace renders a local recent-reading drawer", () => {
  assert.match(html, /const HISTORY_KEY = "sibi\.article\.history\.v1"/);
  assert.match(html, /class="history-drawer"/);
  assert.match(html, /function isHistoryUrl\(value\)/);
  assert.match(html, /function renderHistory\(\)/);
  assert.match(html, /data-history-url=/);
  assert.match(html, /function openHistoryUrl\(url\)/);
});

test("article workspace excludes demo URLs from recent reading history", () => {
  assert.match(html, /parsed\.protocol === "http:" \|\| parsed\.protocol === "https:"/);
  assert.match(html, /if \(!isHistoryUrl\(article\.url\)\) return/);
  assert.match(html, /saveHistory\(filtered\)/);
});
