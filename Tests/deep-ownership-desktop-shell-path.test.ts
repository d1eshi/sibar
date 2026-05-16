import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import {
  createDesktopShellContractFromFixture,
  createDesktopShellFsBridge,
  projectWorkspaceSnapshotFromFixture,
  type DeepOwnershipFixture,
} from "../src/runtime-deep-ownership.ts";

const desktopHtml = readFileSync(join(process.cwd(), "web/workspace-desktop.html"), "utf8");
const desktopShellScript = readFileSync(
  join(process.cwd(), "web/scripts/workspace-desktop-shell.js"),
  "utf8",
);
const fixture = JSON.parse(
  readFileSync(
    join(process.cwd(), "docs/specs/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json"),
    "utf8",
  ),
) as DeepOwnershipFixture;

test("VAL-DESKTOP-001 wires a dedicated desktop shell entrypoint to the existing workspace stack", () => {
  assert.match(desktopHtml, /data-shell-path="dow-desktop-shell-path"/);
  assert.match(desktopHtml, /scripts\/workspace-fixture\.js/);
  assert.match(desktopHtml, /scripts\/workspace-desktop-shell\.js/);
  assert.match(desktopHtml, /scripts\/workspace-render-artifact\.js/);
  assert.match(desktopHtml, /scripts\/workspace-render-loop\.js/);
  assert.match(desktopHtml, /scripts\/workspace-app\.js/);
});

test("VAL-DESKTOP-001 preserves fixture and WorkspaceSnapshot identity parity", () => {
  const contract = createDesktopShellContractFromFixture(fixture);
  const snapshot = projectWorkspaceSnapshotFromFixture(fixture);

  assert.equal(contract.fixture_id, fixture.fixture_id);
  assert.equal(contract.loop_id, fixture.loop_state.id);
  assert.equal(contract.snapshot_id, snapshot.snapshot_id);
  assert.equal(contract.snapshot_id, `SNAP-${fixture.loop_state.id}`);

  assert.match(desktopShellScript, /fixture_id:\s*fixture\.fixture_id/);
  assert.match(desktopShellScript, /loop_id:\s*fixture\.loop_state\.id/);
  assert.match(desktopShellScript, /snapshot_id:\s*snapshotId\(fixture\.loop_state\.id\)/);
});

test("VAL-DESKTOP-001 bounded desktop shell filesystem bridge blocks out-of-bound reads", () => {
  const rootPath = mkdtempSync(join(tmpdir(), "sibar-desktop-shell-"));
  mkdirSync(join(rootPath, "src"), { recursive: true });
  mkdirSync(join(rootPath, "docs"), { recursive: true });
  writeFileSync(join(rootPath, "src/allowed.ts"), "export const allowed = true;\n", "utf8");
  writeFileSync(join(rootPath, "docs/private.md"), "# private\n", "utf8");

  const bridge = createDesktopShellFsBridge({
    root_path: rootPath,
    artifact_boundary: {
      root_path: rootPath,
      source_type: "repository",
      included_sources: ["src", "docs"],
      excluded_sources: ["docs/**"],
      evidence_roles: ["source_truth"],
      entrypoints: ["src/allowed.ts"],
      tests_as_oracles: [],
    },
  });

  const allowedRead = bridge.readTextFile("src/allowed.ts");
  assert.equal(allowedRead.ok, true);
  if (allowedRead.ok) {
    assert.equal(allowedRead.blocked, false);
    assert.match(allowedRead.content, /allowed = true/);
  }

  const traversalBlocked = bridge.readTextFile("../outside.ts");
  assert.equal(traversalBlocked.ok, false);
  assert.equal(traversalBlocked.blocked, true);
  assert.match(traversalBlocked.reason, /parent-directory traversal/i);

  const excludedBlocked = bridge.readTextFile("docs/private.md");
  assert.equal(excludedBlocked.ok, false);
  assert.equal(excludedBlocked.blocked, true);
  assert.match(excludedBlocked.reason, /excluded pattern/i);

  const outsideIncludedBlocked = bridge.readTextFile("package.json");
  assert.equal(outsideIncludedBlocked.ok, false);
  assert.equal(outsideIncludedBlocked.blocked, true);
  assert.match(outsideIncludedBlocked.reason, /outside desktop shell included_sources boundary/i);
});

test("VAL-DESKTOP-001 desktop shell path blocks product mutation and editor dependency", () => {
  const rootPath = mkdtempSync(join(tmpdir(), "sibar-desktop-controls-"));
  mkdirSync(join(rootPath, "src"), { recursive: true });
  writeFileSync(join(rootPath, "src/index.ts"), "export const value = 1;\n", "utf8");

  const bridge = createDesktopShellFsBridge({
    root_path: rootPath,
    artifact_boundary: {
      root_path: rootPath,
      source_type: "repository",
      included_sources: ["src"],
      excluded_sources: [],
      evidence_roles: ["source_truth"],
      entrypoints: ["src/index.ts"],
      tests_as_oracles: [],
    },
  });

  assert.equal(bridge.mutation_allowed, false);
  assert.equal(bridge.editor_plugin_required, false);
  assert.deepEqual(bridge.requestProductMutation(), {
    ok: false,
    blocked: true,
    reason: "Product mutation is blocked in desktop shell prototype path.",
  });
  assert.deepEqual(bridge.requireEditorPlugin(), {
    ok: false,
    blocked: true,
    reason: "Desktop shell path is editor-plugin independent.",
  });

  assert.match(desktopShellScript, /mutation_allowed:\s*false/);
  assert.match(desktopShellScript, /editor_plugin_required:\s*false/);
  assert.match(desktopShellScript, /requestProductMutation:\s*function\(\)/);
  assert.match(desktopShellScript, /requireEditorPlugin:\s*function\(\)/);
});
