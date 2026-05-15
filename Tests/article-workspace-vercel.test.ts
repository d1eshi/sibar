import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = process.cwd();
const webHtml = readFileSync(join(root, "web/article-workspace.html"), "utf8");
const webApi = readFileSync(join(root, "web/api/read.mjs"), "utf8");
const vercelConfig = JSON.parse(readFileSync(join(root, "web/vercel.json"), "utf8"));

test("article workspace web deploy is rooted under /web", () => {
  assert.match(webHtml, /Sibi Article Workspace/);
  assert.match(webHtml, /fetch\(`\/api\/read\?url=\$\{encodeURIComponent\(url\)\}`\)/);
  assert.equal(vercelConfig.framework, null);
  assert.equal(vercelConfig.cleanUrls, true);
  assert.equal(vercelConfig.installCommand, "");
  assert.equal(vercelConfig.buildCommand, null);
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
