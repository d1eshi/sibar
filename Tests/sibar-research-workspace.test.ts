import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const appRoot = join(root, "apps", "sibar-research-workspace");
const legacyRoot = join(appRoot, "legacy");

const workspaceHtml = readFileSync(join(appRoot, "index.html"), "utf8");
const workspaceMain = readFileSync(join(appRoot, "src", "main.tsx"), "utf8");
const workspaceApp = readFileSync(join(appRoot, "src", "App.tsx"), "utf8");
const viteConfig = readFileSync(join(appRoot, "vite.config.ts"), "utf8");
const vercelConfig = JSON.parse(readFileSync(join(appRoot, "vercel.json"), "utf8"));
const workspaceCss = readFileSync(join(appRoot, "styles", "workspace.css"), "utf8");
const workspaceBaseCss = readFileSync(join(appRoot, "styles", "base.css"), "utf8");

const forbiddenLegacyReferences = [
  /legacy/,
  /vanilla/,
  /research-workspace\.[jt]s/,
  /workspace-intent-adapter\.[jt]s/,
];

function assertNoLegacyReferences(text: string, label: string) {
  for (const matcher of forbiddenLegacyReferences) {
    assert.doesNotMatch(text, matcher, `${label} still references ${matcher}`);
  }
}

test("workspace app uses the React Vite entry without legacy script loading", () => {
  assert.equal(existsSync(legacyRoot), false);
  assert.match(workspaceHtml, /<div id="root"><\/div>/);
  assert.match(workspaceHtml, /<script type="module" src="\/src\/main\.tsx"><\/script>/);
  assertNoLegacyReferences(workspaceHtml, "index.html");

  assert.match(workspaceMain, /createRoot\(mount\)\.render/);
  assert.match(workspaceMain, /<App \/>/);
  assert.match(workspaceMain, /\.\/styles\/global\.css/);
  assertNoLegacyReferences(workspaceMain, "src/main.tsx");
});

test("React workspace shell remains the runtime surface", () => {
  assert.match(workspaceApp, /data-component="research-workspace-root"/);
  assert.match(workspaceApp, /<WorkspaceShell/);
  assert.match(workspaceApp, /<MissionOverview/);
  assert.match(workspaceApp, /<WorkspaceSessionLayout/);
  assert.doesNotMatch(workspaceApp, /document\.getElementById/);
  assert.doesNotMatch(workspaceApp, /initResearchWorkspace/);
  assertNoLegacyReferences(workspaceApp, "src/App.tsx");
});

test("Vite and Vercel config target the static React app", () => {
  assert.match(viteConfig, /defineConfig/);
  assert.equal(vercelConfig.framework, "vite");
  assert.equal(vercelConfig.buildCommand, "cd ../.. && pnpm -s workspace:build");
  assert.equal(vercelConfig.outputDirectory, "dist");
  assert.deepEqual(vercelConfig.rewrites, [{ source: "/(.*)", destination: "/index.html" }]);
  assertNoLegacyReferences(viteConfig, "vite.config.ts");
  assertNoLegacyReferences(JSON.stringify(vercelConfig), "vercel.json");
});

test("no chat-first generic landing UI appears in the workspace entry", () => {
  assert.doesNotMatch(workspaceHtml, /\bchat\s*application\b/i);
  assert.doesNotMatch(workspaceHtml, /Send a message/i);
  assert.doesNotMatch(workspaceHtml, /chat interface/i);
  assert.doesNotMatch(workspaceHtml, /assistant\b/i);
  assert.doesNotMatch(workspaceHtml, /Slash command/i);
  assert.doesNotMatch(workspaceHtml, /data-mode="\/map"/);
});

test("static stack is bounded and does not depend on runtime imports", () => {
  assert.doesNotMatch(workspaceHtml, /api\//);
  assert.doesNotMatch(workspaceHtml, /fetch\(/);
  assert.doesNotMatch(workspaceCss + workspaceBaseCss, /@import url/);
});
