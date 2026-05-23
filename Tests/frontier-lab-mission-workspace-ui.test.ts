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
import {
  compileFrontierLabMissionFromUrl,
} from "../engine/workspace/source-mission/frontier-lab-compiler.ts";
import { FRONTIER_LAB_BLOG_URL } from "../engine/workspace/source-mission/frontier-lab-fixture.ts";

const root = process.cwd();
const appSource = readFileSync(join(root, "apps/sibar-research-workspace/src/App.tsx"), "utf8");
const onboardingSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/onboarding/OnboardingFlow.tsx"),
  "utf8",
);
const workspaceProjectionSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/state/workspaceProjection.ts"),
  "utf8",
);
const workspaceReducerSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/state/workspaceReducer.ts"),
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
  assert.match(appSource, /function openCompiledMission\(missionProjection: MissionUiProjection\)/);
  assert.match(appSource, /setActiveMissionProjection\(missionProjection\)/);
  assert.match(appSource, /buildWorkspaceSessionFixtureFromMission\(missionProjection\)/);
  assert.match(appSource, /dispatchWorkspace\(\{\s*type: "reset"/);
  assert.match(appSource, /mission=\{activeMissionProjection\}/);
  assert.match(workspaceProjectionSource, /openTarget: "overview"/);
  assert.match(workspaceReducerSource, /type: "reset"/);
  assert.doesNotMatch(workspaceProjectionSource, /openTarget: "session"/);
});

test("New mission flow uses the frontier-lab compiler instead of generic preview fabrication", () => {
  assert.match(onboardingSource, /compileFrontierLabMissionFromUrl/);
  assert.match(onboardingSource, /FRONTIER_LAB_BLOG_URL/);
  assert.match(onboardingSource, /user_reason: userReason/);
  assert.match(onboardingSource, /buildPreviewFromProjection/);
  assert.match(onboardingSource, /uiProjection\.mission_brief\.title/);
  assert.match(onboardingSource, /sourceContext\.canonical_url/);
  assert.match(onboardingSource, /sourceContext\.user_reason/);
  assert.match(onboardingSource, /uiProjection\.source_map\.signals\.slice\(0, 3\)/);
  assert.match(onboardingSource, /uiProjection\.mission_brief\.tracks\.slice\(0, 3\)/);
  assert.match(onboardingSource, /focusedSessions\.slice\(0, 3\)/);
  assert.match(onboardingSource, /session\.artifacts\.slice\(0, 3\)/);
  assert.match(onboardingSource, /source_intent_input_user_reason/);
  assert.match(onboardingSource, /onOpenWorkspace: \(missionProjection: MissionUiProjection\) => void/);
  assert.match(onboardingSource, /state\.reviewedSignature !== null && state\.compileResult\?\.ok === true && Boolean\(state\.compileResult\.ui_projection\)/);
  assert.doesNotMatch(onboardingSource, /function makeWorkspacePreview/);
  assert.doesNotMatch(onboardingSource, /One focused session/);
});

test("New mission preview exposes bounded source context before Mission Brief opens", () => {
  assert.match(onboardingSource, /Source origin/);
  assert.match(onboardingSource, /Source title/);
  assert.match(onboardingSource, /Canonical URL/);
  assert.match(onboardingSource, /User reason/);
  assert.match(onboardingSource, /This preview comes from the blog source plus your reason/);
  assert.match(onboardingSource, /not a long curriculum/);
  assert.match(onboardingSource, /Detected signals/);
  assert.match(onboardingSource, /Tracks/);
  assert.match(onboardingSource, /Focused Queue/);
  assert.match(onboardingSource, /Artifact hints/);
  assert.match(onboardingSource, /Open Mission Brief/);
  assert.doesNotMatch(onboardingSource, /Advanced Source Map/);
  assert.doesNotMatch(onboardingSource, /workspace inside workspace/i);
});

test("compiled custom mission reason drives UI projection, Home, and session fixture", () => {
  const userReason = "Build a source-backed frontier-lab preparation plan for my interview loop.";
  const result = compileFrontierLabMissionFromUrl({
    url: FRONTIER_LAB_BLOG_URL,
    user_reason: userReason,
    optional_goal: "Keep the plan focused on JAX, scaling foundations, and one artifact.",
    optional_constraints: ["do not broaden beyond the supported source"],
  });

  assert.equal(result.ok, true);
  if (!result.ok || !result.ui_projection) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));
  }

  const home = buildWorkspaceHomeProjectionFromMission(result.ui_projection);
  const fixture = buildWorkspaceSessionFixtureFromMission(result.ui_projection);

  assert.equal(result.ui_projection.mission_brief.source_context.user_reason, userReason);
  assert.equal(home.workspaces[0].objective, userReason);
  assert.equal(home.workspaces[0].userGoal, userReason);
  assert.equal(fixture.title, result.ui_projection.mission_brief.title);
  assert.equal(fixture.sessionHint, result.ui_projection.active_session.operation.prompt);
  assert.equal(fixture.sources.length > 0, true);
});

test("unsupported New mission URL keeps the open action blocked by diagnostics", () => {
  const result = compileFrontierLabMissionFromUrl({
    url: "https://example.com/not-the-frontier-lab-source",
    user_reason: "I still need a mission from this source.",
  });

  assert.equal(result.ok, false);
  assert.equal(result.diagnostics.some((diagnostic) => diagnostic.code === "frontier_lab.unsupported_url"), true);
  assert.match(onboardingSource, /disabled=\{!reviewReady \|\| !compiledProjection\}/);
  assert.match(onboardingSource, /diagnosticText\(state\)/);
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
