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
  compileFrontierLabMissionFromSource,
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
const packageSource = readFileSync(join(root, "package.json"), "utf8");
const missionOverviewSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/workspace/MissionOverview.tsx"),
  "utf8",
);
const workspaceHomeSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/workspace/WorkspaceHome.tsx"),
  "utf8",
);
const jaxThinkingInJaxSource = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/workspace/JaxThinkingInJaxPage.tsx"),
  "utf8",
);
const jaxThinkingInJaxStyles = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/workspace/jaxSourcePage.module.css"),
  "utf8",
);
const jaxThinkingInJaxSourceData = readFileSync(
  join(root, "apps/sibar-research-workspace/src/flows/workspace/jaxThinkingInJaxSource.ts"),
  "utf8",
);
const jaxThinkingInJaxScraperSource = readFileSync(
  join(root, "scripts/scrape-jax-thinking-in-jax.mjs"),
  "utf8",
);
const webWorkspaceHtml = readFileSync(join(root, "web/workspace.html"), "utf8");
const frontierLabPastedText = [
  "The practical path starts with JAX tutorials and the Scaling Book.",
  "Build a small transformer with JAX, Flax, and Optax.",
  "Keep Chinchilla dense-vs-MoE derivations visible.",
  "Later write a Pallas kernel that beats ragged_dot.",
].join(" ");

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

test("App exposes a concrete JAX thinking route outside mission and notes flows", () => {
  assert.match(appSource, /jaxThinkingInJaxRoutes/);
  assert.match(appSource, /\/jax\/thinking-in-jax/);
  assert.match(appSource, /\/jax\/tutorials-and-scaling-book-first-step/);
  assert.match(appSource, /<JaxThinkingInJaxPage \/>/);
  assert.match(jaxThinkingInJaxSource, /Scraped HTML reader/);
  assert.match(jaxThinkingInJaxSource, /dangerouslySetInnerHTML/);
  assert.match(jaxThinkingInJaxSource, /data-source-ref/);
  assert.match(jaxThinkingInJaxSource, /Esta parte no entiendo/);
  assert.match(jaxThinkingInJaxSource, /window\.getSelection/);
  assert.match(jaxThinkingInJaxSource, /kindHighlight|kindQuestion|kindKey/);
  assert.match(jaxThinkingInJaxSource, /pendingSelection/);
  assert.match(jaxThinkingInJaxSource, /pendingNote/);
  assert.match(jaxThinkingInJaxSource, /SourceAnnotation/);
  assert.match(jaxThinkingInJaxSource, /sendAnnotationToLlm/);
  assert.match(jaxThinkingInJaxSource, /AnnotationLlmPayload/);
  assert.match(jaxThinkingInJaxSource, /selectedText/);
  assert.match(jaxThinkingInJaxSource, /userNote/);
  assert.match(jaxThinkingInJaxSource, /Annotation chat/);
  assert.match(jaxThinkingInJaxSource, /Enviar al LLM/);
  assert.match(jaxThinkingInJaxSource, /treeSectionLevel/);
  assert.match(jaxThinkingInJaxSource, /article\.scrollTo/);
  assert.doesNotMatch(jaxThinkingInJaxSource, /scrollIntoView/);
  assert.doesNotMatch(jaxThinkingInJaxSource, /JAX source context|Concrete source route/);
  assert.match(jaxThinkingInJaxStyles, /\.sourceReaderPage\s*\{[\s\S]*height: 100dvh;[\s\S]*overflow: hidden;/);
  assert.match(jaxThinkingInJaxStyles, /\.readerShell\s*\{[\s\S]*height: 100%;[\s\S]*overflow: hidden;/);
  assert.doesNotMatch(jaxThinkingInJaxStyles, /contextPanel/);
  assert.match(jaxThinkingInJaxStyles, /\.scrapedHtmlDocument\s*\{[\s\S]*height: 100%;[\s\S]*overflow: auto;/);
  assert.match(jaxThinkingInJaxSourceData, /jaxThinkingInJaxHtml/);
  assert.match(jaxThinkingInJaxSourceData, /jaxThinkingInJaxScrapeSelector = "article\.bd-article"/);
  assert.match(jaxThinkingInJaxSourceData, /Open in Colab/);
  assert.match(jaxThinkingInJaxSourceData, /Python Package Index/);
  assert.match(jaxThinkingInJaxSourceData, /highlight-ipython3/);
  assert.match(jaxThinkingInJaxSourceData, /Just-in-time compilation with jax\.jit/);
  assert.match(jaxThinkingInJaxSourceData, /Auto-vectorization with jax\.vmap/);
  assert.match(jaxThinkingInJaxSourceData, /Pseudorandom numbers/);
  assert.match(jaxThinkingInJaxSourceData, /jax\.debug\.print/);
  assert.match(jaxThinkingInJaxSourceData, /jax\[cuda13\]/);
  assert.match(jaxThinkingInJaxScraperSource, /extractArticle/);
  assert.match(jaxThinkingInJaxScraperSource, /articleSelector = "article\.bd-article"/);
  assert.match(jaxThinkingInJaxScraperSource, /sections\.length < 10/);
  assert.match(packageSource, /scrape:jax-thinking/);
  assert.match(
    jaxThinkingInJaxSourceData,
    /https:\/\/docs\.jax\.dev\/en\/latest\/notebooks\/thinking_in_jax\.html/,
  );
  assert.doesNotMatch(jaxThinkingInJaxSource, /StudySessionNotes|WorkspaceSessionLayout|MissionOverview|SessionWorkbench/);
});

test("New mission flow uses the frontier-lab compiler instead of generic preview fabrication", () => {
  assert.match(onboardingSource, /compileFrontierLabMissionFromSource/);
  assert.doesNotMatch(onboardingSource, /compileFrontierLabMissionFromUrl/);
  assert.match(onboardingSource, /FRONTIER_LAB_BLOG_URL/);
  assert.match(onboardingSource, /Source URL or pasted text/);
  assert.match(onboardingSource, /source: normalizeText\(values\.source\)/);
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

test("New mission source helper accepts pasted frontier-lab text while preserving bounded preview inputs", () => {
  const result = compileFrontierLabMissionFromSource({
    source: frontierLabPastedText,
    user_reason: "Build a source-backed frontier-lab preparation plan from pasted notes.",
  });

  assert.equal(result.ok, true);
  if (!result.ok || !result.ui_projection) {
    throw new Error(result.diagnostics.map((diagnostic) => diagnostic.code).join(", "));
  }

  assert.equal(result.source_intent_input.source_input.kind, "pasted_text");
  assert.equal(result.source_intake_result.source_kind, "pasted_text");
  assert.equal(result.ui_projection.mission_brief.source_context.source_kind, "pasted_text");
  assert.equal(result.ui_projection.mission_brief.source_context.canonical_url, null);
  assert.equal(result.ui_projection.source_map.signals.length <= 5, true);
  assert.equal(result.ui_projection.focused_queue.visible_sessions.length <= 3, true);
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

test("Home treats mission fixture confidence as source review, not pre-attempt readiness", () => {
  const home = buildWorkspaceHomeProjectionFromMission(frontierLabMissionUiProjection);
  const primary = home.workspaces[0];

  assert.equal(typeof primary.reviewConfidencePercent, "number");
  assert.match(primary.reviewConfidenceLevel, /confidence|review/i);
  assert.match(primary.reviewConfidenceHint, /Source review status/i);
  assert.match(primary.reviewConfidenceHint, /Artifact readiness is pending an attempt/i);
  assert.equal("readinessPercent" in primary, false);
  assert.equal("readinessLevel" in primary, false);
  assert.equal("readinessHint" in primary, false);
  assert.match(workspaceHomeSource, /Source confidence/);
  assert.match(workspaceHomeSource, /source confidence/);
  assert.match(workspaceHomeSource, /source review/);
  assert.doesNotMatch(workspaceHomeSource, /readinessLevel\} readiness/);
  assert.doesNotMatch(workspaceHomeSource, /% readiness/);
});

test("Session guide declares attempt-first pending readiness scoped to active operation evidence", () => {
  assert.match(appSource, /from "..\/..\/..\/engine\/pedagogy-core\/index\.ts"/);
  assert.match(appSource, /evaluateAttempt/);
  assert.match(appSource, /attemptToReadiness/);
  assert.match(appSource, /createAttempt/);
  assert.match(appSource, /submitArtifactEvidenceAttempt/);
  assert.match(appSource, /Artifact\/Evidence attempt/);
  assert.match(appSource, /Check scoped readiness/);
  assert.match(appSource, /Attempt-first result/);
  assert.match(appSource, /Evidence check/);
  assert.match(appSource, /Scoped readiness/);
  assert.match(appSource, /Gap or repair/);
  assert.match(appSource, /Readiness pending: submit an Artifact\/Evidence attempt/);
  assert.match(appSource, /Session operation before any readiness claim/);
  assert.match(appSource, /Operation scope:/);
  assert.match(appSource, /Artifact scope:/);
  assert.match(appSource, /Evidence scope:/);
  assert.match(appSource, /activeMissionProjection\.active_session/);
  assert.match(workspaceProjectionSource, /Readiness is pending until an artifact or evidence attempt/);
  assert.match(missionOverviewSource, /Readiness pending an Artifact\/Evidence attempt/);
  assert.doesNotMatch(appSource, /whole mission readiness/i);
  assert.doesNotMatch(appSource, /Good readiness|Ready readiness/i);
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
