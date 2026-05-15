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

test("article workspace opens duplicate URLs from session state before fetching", () => {
  assert.match(html, /function normalizeArticleUrl\(rawUrl\)/);
  assert.match(html, /function getSavedWorkspaceByUrl\(url\)/);
  assert.match(html, /Ya estaba abierto en esta sesion\. Lo recuperamos sin pedirlo al servidor\./);
  assert.match(html, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
});

test("article workspace renders a session-only recent-reading drawer", () => {
  assert.match(html, /let sessionHistory = \[\]/);
  assert.match(html, /class="history-drawer"/);
  assert.match(html, /function isHistoryUrl\(value\)/);
  assert.match(html, /function renderHistory\(\)/);
  assert.match(html, /data-history-url=/);
  assert.match(html, /function openHistoryUrl\(url\)/);
});

test("article workspace excludes demo URLs from recent reading history", () => {
  assert.match(html, /parsed\.protocol === "http:" \|\| parsed\.protocol === "https:"/);
  assert.match(html, /if \(!isHistoryUrl\(article\.url\)\) return/);
  assert.match(html, /sessionHistory = \[nextItem, \.\.\.sessionHistory\.filter/);
});

test("article workspace keeps logs session-only without localStorage or export", () => {
  assert.doesNotMatch(html, /localStorage/);
  assert.doesNotMatch(html, /Exportar JSON/);
  assert.match(html, /Learning Log/);
  assert.match(html, /const MAX_SESSION_NOTES = 12/);
});

test("article workspace presents the reader as evidence-first learning", () => {
  assert.match(html, /Deep knowledge improves what you build\./);
  assert.match(html, /Read for evidence\./);
  assert.match(html, /que cambio tu modelo mental/);
});

test("article workspace keeps reader and side panels as independent scroll areas", () => {
  assert.match(html, /body \{[\s\S]*overflow: hidden;/);
  assert.match(html, /\.workspace \{[\s\S]*height: 100vh;/);
  assert.match(html, /\.reader-scroll \{[\s\S]*min-height: 0;[\s\S]*overflow: auto;/);
  assert.match(html, /\.history-list \{[\s\S]*flex: 1;[\s\S]*overflow: auto;/);
  assert.match(html, /\.assistant-body \{[\s\S]*flex: 1;[\s\S]*overflow: auto;/);
});
