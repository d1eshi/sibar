import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "web/article-workspace.html"), "utf8");

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

test("article workspace opens duplicate URLs from local browser state before fetching", () => {
  assert.match(html, /function normalizeArticleUrl\(rawUrl\)/);
  assert.match(html, /function getSavedWorkspaceByUrl\(url\)/);
  assert.match(html, /Ya estaba guardado en este navegador\. Lo recuperamos sin pedirlo al servidor\./);
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
  assert.match(html, /sessionHistory = \[nextItem, \.\.\.sessionHistory\.filter/);
});

test("article workspace persists notes locally without export", () => {
  assert.match(html, /const STORAGE_KEY = "sibi\.article\.workspace\.v1"/);
  assert.match(html, /localStorage\.setItem\(key, JSON\.stringify\(value\)\)/);
  assert.match(html, /function loadWorkspaceStore\(\)/);
  assert.doesNotMatch(html, /Exportar JSON/);
  assert.match(html, /Learning Log/);
  assert.match(html, /const MAX_SESSION_NOTES = 12/);
});

test("article workspace enables only aggregate Vercel page analytics", () => {
  assert.match(html, /window\.va = window\.va \|\| function/);
  assert.match(html, /window\.va\("beforeSend"/);
  assert.match(html, /url\.search = ""/);
  assert.match(html, /\/_vercel\/insights\/script\.js/);
  assert.doesNotMatch(html, /window\.va\("event"/);
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
