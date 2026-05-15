import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "web/index.html"), "utf8");
const css = readFileSync(join(process.cwd(), "web/styles/reader.css"), "utf8");
const app = readFileSync(join(process.cwd(), "web/scripts/app.js"), "utf8");
const api = readFileSync(join(process.cwd(), "web/scripts/api.js"), "utf8");
const storage = readFileSync(join(process.cwd(), "web/scripts/storage.js"), "utf8");
const ui = readFileSync(join(process.cwd(), "web/scripts/ui.js"), "utf8");

test("article workspace exposes tab-style note kind controls", () => {
  assert.match(html, /role="tablist" aria-label="Tipo de nota"/);
  assert.match(html, /role="tab" aria-selected="true" data-kind="highlight"/);
  assert.match(html, /role="tab" aria-selected="false" data-kind="question"/);
  assert.match(html, /role="tab" aria-selected="false" data-kind="key"/);
});

test("article workspace wires keyboard shortcuts for pending note capture", () => {
  assert.match(ui, /KIND_ORDER = \["highlight", "question", "key"\]/);
  assert.match(app, /pendingSelection && event\.key === "Tab"/);
  assert.match(app, /cyclePendingKind\(event\.shiftKey \? -1 : 1\)/);
  assert.match(app, /event\.key === "Enter" && \(event\.metaKey \|\| event\.ctrlKey\)/);
  assert.match(app, /savePending\(\)/);
});

test("article workspace opens duplicate URLs from local browser state before fetching", () => {
  assert.match(api, /function normalizeArticleUrl\(rawUrl\)/);
  assert.match(storage, /function getSavedWorkspaceByUrl\(url\)/);
  assert.match(app, /Ya estaba guardado en este navegador\. Lo recuperamos sin pedirlo al servidor\./);
  assert.match(api, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
});

test("article workspace renders a local recent-reading drawer", () => {
  assert.match(storage, /const HISTORY_KEY = "sibar\.reader\.history\.v1"/);
  assert.match(storage, /const LEGACY_HISTORY_KEY = "sibi\.article\.history\.v1"/);
  assert.match(html, /class="history-drawer"/);
  assert.match(storage, /function isHistoryUrl\(value\)/);
  assert.match(ui, /function renderHistory\(elements, history, activeUrl\)/);
  assert.match(ui, /data-history-url=/);
  assert.match(app, /function openHistoryUrl\(url\)/);
});

test("article workspace excludes demo URLs from recent reading history", () => {
  assert.match(storage, /parsed\.protocol === "http:" \|\| parsed\.protocol === "https:"/);
  assert.match(storage, /if \(!isHistoryUrl\(article\.url\)\) return history/);
  assert.match(storage, /return \[nextItem, \.\.\.history\.filter/);
});

test("article workspace persists notes locally without export", () => {
  assert.match(storage, /const STORAGE_KEY = "sibar\.reader\.workspace\.v1"/);
  assert.match(storage, /const LEGACY_STORAGE_KEY = "sibi\.article\.workspace\.v1"/);
  assert.match(storage, /localStorage\.setItem\(key, JSON\.stringify\(value\)\)/);
  assert.match(storage, /function loadWorkspaceStore\(\)/);
  assert.doesNotMatch(html, /Exportar JSON/);
  assert.match(html, /Learning Log/);
  assert.match(app, /const MAX_SESSION_NOTES = 12/);
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
  assert.match(html, /Sibar \/ Reader/);
});

test("article workspace keeps reader and side panels as independent scroll areas", () => {
  assert.match(css, /body \{[\s\S]*overflow: hidden;/);
  assert.match(css, /\.workspace \{[\s\S]*height: 100vh;/);
  assert.match(css, /\.reader-scroll \{[\s\S]*min-height: 0;[\s\S]*overflow: auto;/);
  assert.match(css, /\.history-list \{[\s\S]*flex: 1;[\s\S]*overflow: auto;/);
  assert.match(css, /\.assistant-body \{[\s\S]*flex: 1;[\s\S]*overflow: auto;/);
});
