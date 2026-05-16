import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const workspaceHtml = readFileSync(join(process.cwd(), "web/workspace.html"), "utf8");
const fixtureScript = readFileSync(join(process.cwd(), "web/scripts/workspace-fixture.js"), "utf8");
const artifactRenderer = readFileSync(
  join(process.cwd(), "web/scripts/workspace-render-artifact.js"),
  "utf8",
);
const patchRenderer = readFileSync(
  join(process.cwd(), "web/scripts/workspace-render-patch-readiness.js"),
  "utf8",
);

test("VAL-UI-013 wires patch readiness assets and renderer entrypoint", () => {
  assert.match(workspaceHtml, /styles\/components-patch-readiness\.css/);
  assert.match(workspaceHtml, /scripts\/workspace-render-patch-readiness\.js/);
  assert.match(artifactRenderer, /renderPatchReadinessArtifact\(art\)/);
  assert.match(artifactRenderer, /Patch Readiness/);
});

test("patch readiness fixture contains mutation gate + output strip contract fields", () => {
  assert.match(fixtureScript, /"id": "TA-003"/);
  assert.match(fixtureScript, /"kind": "patch_preview"/);
  assert.match(fixtureScript, /"renderer": "patch_preview"/);
  assert.match(fixtureScript, /"product_mutation_gate": \{/);
  assert.match(fixtureScript, /"explicit_user_request": false/);
  assert.match(fixtureScript, /"current_readiness": \{\s*"status": "limited"/);
  assert.match(fixtureScript, /"missing_evidence": \[/);
  assert.match(fixtureScript, /"verification_command": "pnpm test -- Tests\/deep-ownership-mutation-editor-bridge\.test\.ts"/);
  assert.match(fixtureScript, /"command_output_strip": \[/);
});

test("patch readiness renderer exposes required panes, gate rail, output strip, and blocked apply explanation", () => {
  assert.match(patchRenderer, /original-readonly-pane/);
  assert.match(patchRenderer, /patch-preview-pane/);
  assert.match(patchRenderer, /change-summary-row/);
  assert.match(patchRenderer, /readiness-gate-rail/);
  assert.match(patchRenderer, /command-output-strip/);
  assert.match(patchRenderer, /!gate\.explicit_user_request/);
  assert.match(patchRenderer, /gate\.current_readiness\?\.status !== "ready"/);
  assert.match(patchRenderer, /missingEvidence\.length > 0/);
  assert.match(patchRenderer, /apply-patch-btn/);
  assert.match(patchRenderer, /disabled aria-disabled="true"/);
  assert.match(patchRenderer, /Missing evidence:/);
  assert.match(patchRenderer, /Required verification command:/);
});
