import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  buildWorkspaceHomeProjectionFromMission,
  buildWorkspaceSessionFixtureFromMission,
  frontierLabMissionUiProjection,
  workspaceHomeProjection,
} from "../apps/sibar-research-workspace/src/state/workspaceProjection.ts";

const root = process.cwd();
const appSource = readFileSync(join(root, "apps/sibar-research-workspace/src/App.tsx"), "utf8");
const workspaceProjectionSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/state/workspaceProjection.ts"),
  "utf8",
);
const missionOverviewSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/workspace/MissionOverview.tsx"),
  "utf8",
);
const webWorkspaceHtml = readFileSync(join(root, "web/workspace.html"), "utf8");

test("Home uses the frontier-lab blog mission as primary instead of embeddings", () => {
  const home = buildWorkspaceHomeProjectionFromMission(frontierLabMissionUiProjection);
  const primary = home.workspaces[0];

  assert.equal(workspaceHomeProjection.workspaces[0].id, primary.id);
  assert.match(primary.title, /Frontier lab practical next steps/);
  assert.match(primary.sourceBoundary, /JAX tutorials/);
  assert.match(primary.sourceBoundary, /Scaling Book/);
  assert.match(primary.sourceOriginUrl ?? "", /vladfeinberg\.com\/2026\/05\/10/);
  assert.equal(primary.openTarget, "overview");
  assert.doesNotMatch(primary.title, /Embeddings/i);
  assert.doesNotMatch(primary.objective, /nearest-neighbor|embeddings/i);
});

test("derived session fixture stays focused and carries frontier-lab source-backed data", () => {
  const fixture = buildWorkspaceSessionFixtureFromMission(frontierLabMissionUiProjection);
  const serialized = JSON.stringify(fixture);

  assert.equal(fixture.nodes.length <= 5, true);
  assert.equal(fixture.nodes.length > 0, true);
  assert.match(serialized, /JAX/);
  assert.match(serialized, /Scaling Book/);
  assert.match(serialized, /transformer/i);
  assert.match(serialized, /Pallas/);
  assert.equal(fixture.sources.every((source) => source.metadata.includes("frontier-lab-blog#")), true);
});

test("App opens Home and routes workspace opens to Mission Brief before Session", () => {
  assert.match(appSource, /React\.useState<AppFlowStep>\("home"\)/);
  assert.match(appSource, /<MissionOverview/);
  assert.match(appSource, /onOpenWorkspace=\{\(workspace\) => openFlowStep\(workspace\.openTarget\)\}/);
  assert.match(workspaceProjectionSource, /openTarget: "overview"/);
  assert.doesNotMatch(workspaceProjectionSource, /openTarget: "session"/);
});

test("static workspace page leads with frontier-lab Mission Brief and secondary Source Map", () => {
  assert.match(webWorkspaceHtml, /Frontier lab practical next steps/);
  assert.match(
    webWorkspaceHtml,
    /https:\/\/vladfeinberg\.com\/2026\/05\/10\/how-to-land-a-job-at-a-frontier-lab\.html/,
  );
  assert.match(webWorkspaceHtml, /Focused Queue/);
  assert.match(webWorkspaceHtml, /Advanced Source Map/);
  assert.ok(webWorkspaceHtml.indexOf("Mission Brief") < webWorkspaceHtml.indexOf("Workspace Grid"));
});

test("MissionOverview declares the source-backed mission sections", () => {
  assert.match(missionOverviewSource, /sourceContext = mission\.mission_brief\.source_context/);
  assert.match(missionOverviewSource, /Source origin/);
  assert.match(missionOverviewSource, /canonical_url/);
  assert.match(missionOverviewSource, /User goal/);
  assert.match(missionOverviewSource, /mission\.mission_brief\.user_goal/);
  assert.match(missionOverviewSource, /aria-label="Tracks"/);
  assert.match(missionOverviewSource, /aria-label="Focused Queue"/);
  assert.match(missionOverviewSource, /Expected Artifacts/);
  assert.match(missionOverviewSource, /Advanced Source Map/);
});

test("workspace UI copy does not include disallowed nested-workspace phrasing", () => {
  const combined = [
    appSource,
    workspaceProjectionSource,
    webWorkspaceHtml,
    missionOverviewSource,
  ].join("\n");

  assert.doesNotMatch(combined, /workspace inside workspace/i);
});
