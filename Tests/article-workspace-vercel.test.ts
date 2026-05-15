import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.cwd();
const webHtml = readFileSync(join(root, "web/index.html"), "utf8");
const legacyHtml = readFileSync(join(root, "web/article-workspace.html"), "utf8");
const changelogHtml = readFileSync(join(root, "web/changelog.html"), "utf8");
const webApiClient = readFileSync(join(root, "web/scripts/api.js"), "utf8");
const webApi = readFileSync(join(root, "web/api/read.mjs"), "utf8");
const analyticsResearch = readFileSync(join(root, "web/ANALYTICS_RESEARCH.md"), "utf8");
const vercelConfig = JSON.parse(readFileSync(join(root, "web/vercel.json"), "utf8"));

test("article workspace web deploy is rooted under /web", () => {
  assert.match(webHtml, /Sibar Reader/);
  assert.match(webHtml, /<link rel="stylesheet" href="\/styles\/reader\.css">/);
  assert.match(webHtml, /<script type="module" src="\/scripts\/app\.js"><\/script>/);
  assert.match(webApiClient, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
  assert.equal(vercelConfig.framework, null);
  assert.equal(vercelConfig.cleanUrls, true);
  assert.equal(vercelConfig.installCommand, "");
  assert.equal(vercelConfig.buildCommand, null);
  assert.doesNotMatch(JSON.stringify(vercelConfig), /article-workspace/);
});

test("legacy article workspace path redirects to the root reader", () => {
  assert.match(legacyHtml, /location\.replace\('\/' \+ location\.search \+ location\.hash\)/);
  assert.match(legacyHtml, /<link rel="canonical" href="\/">/);
});

test("web changelog is a direct URL page and not linked from the reader", () => {
  assert.match(changelogHtml, /Sibar Changelog/);
  assert.match(changelogHtml, /Focused Reader Visual Iteration/);
  assert.match(changelogHtml, /Public Reader Foundation/);
  assert.match(changelogHtml, /href="\/styles\/changelog\.css"/);
  assert.doesNotMatch(webHtml, /href="\/changelog"|href="\/changelog\.html"/);
});

test("article workspace Vercel API is self-contained JavaScript", () => {
  assert.doesNotMatch(webApi, /\.\.\/src|src\/article-workspace|typescript|experimental-strip-types/);
  assert.match(webApi, /export async function GET\(request\)/);
  assert.match(webApi, /Private network article URLs are not supported/);
  assert.match(webApi, /RATE_LIMIT_MAX_PER_MINUTE/);
  assert.match(webApi, /vercel-cdn-cache-control/);
});

test("article workspace Vercel API rejects invalid URLs before fetching", async () => {
  const { GET } = await import(pathToFileURL(join(root, "web/api/read.mjs")).href);
  const response = await GET(new Request("https://sibi.test/api/read?url=file:///etc/passwd"));
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.match(body.error, /Only http and https/);
});

test("article workspace documents analytics privacy boundaries", () => {
  assert.match(analyticsResearch, /Do not track article URLs/);
  assert.match(analyticsResearch, /does not use cookies/);
  assert.match(analyticsResearch, /We do not send your notes/);
  assert.match(analyticsResearch, /reading time/);
});
