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
const tauriConfig = JSON.parse(readFileSync(join(appRoot, "src-tauri", "tauri.conf.json"), "utf8"));
const tauriCargo = readFileSync(join(appRoot, "src-tauri", "Cargo.toml"), "utf8");
const tauriMain = readFileSync(join(appRoot, "src-tauri", "src", "main.rs"), "utf8");
const currentSpecPath = join(root, "docs", "specs", "deep-ownership-workspace", "00_current_north_star.md");

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

test("source-driven mission vocabulary is present in the current workspace spec", () => {
  assert.ok(existsSync(currentSpecPath), `missing current spec document at ${currentSpecPath}`);
  const currentSpec = readFileSync(currentSpecPath, "utf8").toLowerCase();

  for (const term of [
    "URL or pasted text",
    "SourceSignals",
    "MissionPreview",
    "Mission Brief",
    "Focused Track Queue",
    "Active Session",
    "Artifact evidence",
    "scoped readiness",
  ]) {
    assert.ok(currentSpec.includes(term.toLowerCase()), `missing ${term} in current spec document`);
  }
});

test("spec pack reading order lists only canonical deep ownership files", () => {
  const specPackReadme = readFileSync(join(root, "docs/specs/deep-ownership-workspace/README.md"), "utf8");
  assert.match(specPackReadme, /00_current_north_star\.md/);
  assert.match(specPackReadme, /01_source_to_mission_mvp\.md/);
  assert.match(specPackReadme, /02_runtime_boundary\.md/);
  assert.match(specPackReadme, /03_validation_and_plan\.md/);
  assert.doesNotMatch(specPackReadme, /00_new_app_tauri_workspace\.md/);
  assert.doesNotMatch(specPackReadme, /13_tauri_second_app_product_plan\.md/);
});

test("no chat-first generic landing UI appears in the workspace entry", () => {
  assert.doesNotMatch(workspaceHtml, /\bchat\s*application\b/i);
  assert.doesNotMatch(workspaceHtml, /Send a message/i);
  assert.doesNotMatch(workspaceHtml, /chat interface/i);
  assert.doesNotMatch(workspaceHtml, /assistant\b/i);
  assert.doesNotMatch(workspaceHtml, /Slash command/i);
  assert.doesNotMatch(workspaceHtml, /data-mode="\/map"/);
});

test("Tauri config and shell scaffold target the workspace frontend", () => {
  assert.equal(tauriConfig.build.beforeBuildCommand, "pnpm workspace:build");
  assert.equal(tauriConfig.build.beforeDevCommand, "pnpm workspace:dev");
  assert.equal(tauriConfig.build.frontendDist, "dist");
  assert.equal(tauriConfig.productName, "Sibar Research Workspace");
  assert.equal(tauriConfig.version, "0.1.0");
  assert.equal(tauriConfig.app.windows[0].title, "Sibar Research Workspace");
  assert.equal(tauriConfig.app.windows[0].width >= 1200, true);
  assert.equal(tauriConfig.package, undefined);
  assert.equal(existsSync(join(appRoot, "src-tauri", "build.rs")), true);
  assert.match(tauriCargo, /tauri-build/);
  assert.match(tauriCargo, /tauri = \{ version = "2.0.0"/);
  assert.match(tauriMain, /tauri::Builder/);
});

test("static stack is bounded and does not depend on runtime imports", () => {
  assert.doesNotMatch(workspaceHtml, /api\//);
  assert.doesNotMatch(workspaceHtml, /fetch\(/);
  assert.doesNotMatch(workspaceCss + workspaceBaseCss, /@import url/);
});
