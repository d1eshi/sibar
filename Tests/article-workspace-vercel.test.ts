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
const webDevServer = readFileSync(join(root, "scripts/web-dev.mjs"), "utf8");
const earlyAccessApi = readFileSync(join(root, "web/api/early-access.mjs"), "utf8");
const analyticsResearch = readFileSync(join(root, "web/ANALYTICS_RESEARCH.md"), "utf8");
const vercelOwnershipSpec = readFileSync(join(root, "docs/specs/11_vercel_deploy_ownership.md"), "utf8");
const rootVercelIgnore = readFileSync(join(root, ".vercelignore"), "utf8");
const webVercelIgnore = readFileSync(join(root, "web/.vercelignore"), "utf8");
const rootVercelConfig = JSON.parse(readFileSync(join(root, "vercel.json"), "utf8"));
const vercelConfig = JSON.parse(readFileSync(join(root, "web/vercel.json"), "utf8"));

test("article workspace web deploy is rooted under /web", () => {
  assert.match(webHtml, /Sibar - De leer papers a construir entendimiento/);
  assert.match(webHtml, /<link rel="stylesheet" href="styles\/reader\.css">/);
  assert.match(webHtml, /<script type="module" src="scripts\/landing\.js"><\/script>/);
  assert.match(webApiClient, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
  assert.equal(vercelConfig.framework, null);
  assert.equal(vercelConfig.cleanUrls, true);
  assert.equal(vercelConfig.installCommand, "");
  assert.equal(vercelConfig.buildCommand, null);
  assert.deepEqual(Object.keys(vercelConfig.functions), ["api/read.mjs", "api/early-access.mjs"]);
  assert.equal(vercelConfig.functions["api/read.mjs"].maxDuration, 10);
  assert.equal(vercelConfig.functions["api/early-access.mjs"].maxDuration, 5);
  assert.doesNotMatch(JSON.stringify(vercelConfig), /article-workspace/);
});

test("Vercel deploy ownership spec protects SSR and function changes", () => {
  assert.match(vercelOwnershipSpec, /framework.*null/s);
  assert.match(vercelOwnershipSpec, /installCommand/);
  assert.match(vercelOwnershipSpec, /buildCommand/);
  assert.match(vercelOwnershipSpec, /api\/read\.mjs/);
  assert.match(vercelOwnershipSpec, /maxDuration.*10/s);
  assert.match(vercelOwnershipSpec, /If this is SSR, why do we own that complexity now\?/);
  assert.match(vercelOwnershipSpec, /If this is a new function/);
  assert.match(vercelOwnershipSpec, /What prevents repeated fetches for the same URL\?/);
  assert.match(vercelOwnershipSpec, /What prevents abuse from anonymous users\?/);
});

test("local Bun web dev server serves the same article API route", () => {
  assert.match(webDevServer, /import \{ GET as readArticle \} from "\.\.\/web\/api\/read\.mjs"/);
  assert.match(webDevServer, /import \{ POST as requestEarlyAccess \} from "\.\.\/web\/api\/early-access\.mjs"/);
  assert.match(webDevServer, /url\.pathname === "\/api\/read"/);
  assert.match(webDevServer, /return readArticle\(request\)/);
  assert.match(webDevServer, /url\.pathname === "\/api\/early-access"/);
  assert.match(webDevServer, /return requestEarlyAccess\(request\)/);
  assert.match(webDevServer, /url\.pathname === "\/favicon\.ico"/);
  assert.match(webDevServer, /status: 204/);
});

test("legacy article workspace path redirects to the root reader", () => {
  assert.match(legacyHtml, /location\.replace\('\/' \+ location\.search \+ location\.hash\)/);
  assert.match(legacyHtml, /<link rel="canonical" href="\/">/);
});

test("web changelog is a direct URL page and not linked from the reader", () => {
  assert.match(changelogHtml, /Sibar Changelog/);
  assert.match(changelogHtml, /Reader enfocado/);
  assert.match(changelogHtml, /Primer reader publico/);
  assert.match(changelogHtml, /Analitica limitada a visitas agregadas/);
  assert.doesNotMatch(changelogHtml, /\/api|localStorage|deploy surface|SSR|build step|Tests cubren/);
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

test("early access Vercel API is server-side only and self-contained", () => {
  assert.doesNotMatch(earlyAccessApi, /\.\.\/src|src\/article-workspace|typescript|experimental-strip-types/);
  assert.match(earlyAccessApi, /export async function POST\(request\)/);
  assert.match(earlyAccessApi, /process\.env\.SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(earlyAccessApi, /content-type/);
  assert.doesNotMatch(webHtml, /SUPABASE_SERVICE_ROLE_KEY|service_role/i);
});

test("article workspace deploy excludes repository internals", () => {
  assert.equal(rootVercelConfig.outputDirectory, "web");
  assert.equal(rootVercelConfig.buildCommand, "pnpm run vercel:build");
  assert.equal(rootVercelConfig.cleanUrls, true);
  assert.deepEqual(rootVercelConfig.rewrites, [
    {
      source: "/sibi",
      destination: "/sibi/index.html",
    },
  ]);
  assert.match(rootVercelIgnore, /^\*$/m);
  assert.match(rootVercelIgnore, /^!web\/index\.html$/m);
  assert.match(rootVercelIgnore, /^!web\/api\/\*\*$/m);
  assert.match(rootVercelIgnore, /^!sibi\/index\.html$/m);
  assert.match(rootVercelIgnore, /^!sibi\/vite\.public\.config\.js$/m);
  assert.match(rootVercelIgnore, /^!sibi\/src\/\*\*$/m);
  assert.match(rootVercelIgnore, /^!apps\/early-access\/\*\*$/m);
  assert.match(webVercelIgnore, /^\.vercel$/m);
  assert.match(webVercelIgnore, /^ANALYTICS_RESEARCH\.md$/m);
  assert.doesNotMatch(rootVercelIgnore, /^!docs\//m);
  assert.doesNotMatch(rootVercelIgnore, /^!AGENTS\.md$/m);
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
