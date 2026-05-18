import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const html = readFileSync(join(process.cwd(), "web/index.html"), "utf8");
const css = readFileSync(join(process.cwd(), "web/styles/reader.css"), "utf8");
const app = readFileSync(join(process.cwd(), "web/scripts/app.js"), "utf8");
const api = readFileSync(join(process.cwd(), "web/scripts/api.js"), "utf8");
const sample = readFileSync(join(process.cwd(), "web/scripts/sample-article.js"), "utf8");
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

test("article workspace leaves loading state after failed source loads", () => {
  assert.match(app, /elements\.form\.addEventListener\("submit", async \(event\) => \{/);
  assert.match(app, /catch \(error\) \{[\s\S]*showStart\(\);[\s\S]*setStatus\(elements, error instanceof Error \? error\.message : "Error\."\);[\s\S]*\}/);
});

test("article workspace opens duplicate URLs from local browser state before fetching", () => {
  assert.match(api, /function normalizeArticleUrl\(rawUrl\)/);
  assert.match(storage, /function getSavedWorkspaceByUrl\(url\)/);
  assert.match(app, /Ya estaba guardado en este navegador\. Lo recuperamos sin pedirlo al servidor\./);
  assert.match(api, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
});

test("article workspace gates new public sources before server fetch", () => {
  assert.match(storage, /const SOURCE_TRIAL_KEY = "sibar\.reader\.sourceTrial\.v1"/);
  assert.match(storage, /const SOURCE_TRIAL_LIMIT = 3/);
  assert.match(storage, /function isSourceTrialBlocked\(url\)/);
  assert.match(storage, /function recordSourceTrialUrl\(url\)/);
  assert.match(app, /if \(isSourceTrialBlocked\(url\)\) \{/);
  assert.match(app, /showEarlyAccess\(url\)/);
  assert.match(app, /const payload = await fetchReadableArticle\(url\);/);
  assert.match(app, /recordSourceTrialUrl\(url\);/);
  assert.match(html, /Ya probaste las fuentes reales incluidas en esta prueba publica\./);
  assert.match(html, /Solicitar early access/);
});

test("article workspace early access form posts only email and optional X handle", () => {
  assert.match(html, /<form class="early-access-form" id="earlyAccessForm">/);
  assert.match(html, /id="earlyAccessEmail" name="email" type="email"/);
  assert.match(html, /id="earlyAccessXHandle" name="x_handle" type="text"/);
  assert.match(html, /id="earlyAccessStatus" aria-live="polite"/);
  assert.match(api, /function requestEarlyAccess\(input\)/);
  assert.match(api, /fetch\("\/api\/early-access"/);
  assert.match(api, /method: "POST"/);
  assert.match(api, /"content-type": "application\/json"/);
  assert.match(api, /email: input\.email/);
  assert.match(api, /x_handle: input\.xHandle \|\| null/);
  assert.doesNotMatch(api, /SUPABASE|service_role|SERVICE_ROLE|localStorage|goal|source_url/i);
  assert.match(app, /function submitEarlyAccess\(\)/);
  assert.match(app, /requestEarlyAccess\(\{ email, xHandle \}\)/);
  assert.match(app, /elements\.earlyAccessForm\.reset\(\)/);
  assert.doesNotMatch(app, /SUPABASE|service_role|SERVICE_ROLE|localStorage\.setItem|goal|source_url/i);
});

test("article workspace renders local recent reading only when it exists", () => {
  assert.match(storage, /const HISTORY_KEY = "sibar\.reader\.history\.v1"/);
  assert.match(storage, /const LEGACY_HISTORY_KEY = "sibi\.article\.history\.v1"/);
  assert.match(html, /class="recent-sources" id="recentSources"/);
  assert.match(storage, /function isHistoryUrl\(value\)/);
  assert.match(ui, /function renderHistory\(elements, history, activeUrl\)/);
  assert.match(ui, /recentSources\.hidden = history\.length === 0/);
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
  assert.match(html, /Guardadas/);
  assert.match(html, /id="savedChip"/);
  assert.match(html, /⌘\/Ctrl \+ Enter para guardar/);
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
  assert.match(html, /class="brand-lockup"/);
  assert.match(html, /<span class="brand-letter primary">S<\/span>/);
  assert.match(html, /<span class="brand-letter">i<\/span>/);
  assert.match(html, /<span class="brand-letter">b<\/span>/);
  assert.match(html, /<span class="brand-letter">a<\/span>/);
  assert.match(html, /<span class="brand-letter">r<\/span>/);
  assert.doesNotMatch(html, /class="brand-name"/);
  assert.match(html, /<p class="brand-mark">Build-to-Learn<\/p>/);
  assert.match(html, /Estudia una fuente tecnica con evidencia\./);
  assert.match(html, /Lee, marca lo importante y guarda dudas o ideas/);
  assert.match(html, /Pega una URL para empezar/);
  assert.match(html, />Estudiar<\/button>/);
  assert.match(html, /El workspace completo abre por early access/);
  assert.doesNotMatch(html, /Prueba publica: 3 fuentes reales por navegador/);
});

test("article workspace source examples are contextual labels, not inert buttons", () => {
  assert.match(html, /<ul class="source-examples" aria-label="Tipos de fuente">/);
  assert.match(html, /<li class="source-chip"><span>Articulo<\/span><small>Argumento o ensayo tecnico<\/small><\/li>/);
  assert.match(html, /<li class="source-chip"><span>Paper<\/span><small>Abstract, metodo o conclusion<\/small><\/li>/);
  assert.match(html, /<li class="source-chip"><span>Docs<\/span><small>API, framework o arquitectura<\/small><\/li>/);
  assert.doesNotMatch(app, /document\.querySelectorAll\("\\.source-chip"\)/);
});

test("article workspace uses the focused source-ingestion visual shell", () => {
  assert.match(css, /\.start-screen \{[\s\S]*min-height: 100vh;/);
  assert.match(css, /\.ingest-row \{[\s\S]*grid-template-columns: minmax\(0, 1fr\) 132px 124px;/);
  assert.match(css, /\.ghost-reader \{[\s\S]*border-left: 1px dashed var\(--line\);/);
  assert.match(css, /\.article-shell \{[\s\S]*padding: 56px 24px 72px;/);
  assert.match(css, /\.saved-drawer \{[\s\S]*position: fixed;/);
});

test("article workspace seeds demo-only mark colors without saved notes", () => {
  assert.match(sample, /demoMarks: \[/);
  assert.match(sample, /selectedText: "conservar la frase exacta que te movio"/);
  assert.match(sample, /kind: "question"/);
  assert.match(sample, /kind: "key"/);
  assert.match(ui, /demoMarks/);
  assert.match(ui, /demo-mark/);
});

test("article workspace dismisses saved drawer with an animated slide", () => {
  assert.match(css, /\.saved-drawer \{[\s\S]*transform: translateX\(calc\(100% \+ 36px\)\);[\s\S]*transition:/);
  assert.match(css, /body\.drawer-open \{[\s\S]*overflow: hidden;[\s\S]*overscroll-behavior: none;/);
  assert.match(css, /\.saved-drawer \{[\s\S]*overscroll-behavior: contain;/);
  assert.match(css, /\.saved-drawer\.is-open \{[\s\S]*transform: translateX\(0\);/);
  assert.match(app, /function openSavedDrawer\(\)/);
  assert.match(app, /function closeSavedDrawer\(\)/);
  assert.match(app, /document\.body\.classList\.add\("drawer-open"\)/);
  assert.match(app, /document\.body\.classList\.remove\("drawer-open"\)/);
  assert.match(app, /document\.addEventListener\("pointerdown"/);
  assert.match(app, /elements\.savedDrawer\.contains\(event\.target\) \|\| elements\.savedChip\.contains\(event\.target\)/);
});
