import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CodeView as VanillaCodeView, parsePatchFiles } from "@pierre/diffs";
import { PierreCodeView } from "../sibi/src/ownershipWorkbench/components/PierreCodeView.ts";
import type { BoundaryState } from "../sibi/src/ownershipWorkbench/types.ts";

type OwnershipWorkbenchFixtures = typeof import("../sibi/src/ownershipWorkbench/fixtures.ts");
type OwnershipWorkbenchHelpers = typeof import("../sibi/src/ownershipWorkbench/helpers.ts");
type OwnershipWorkbenchSurfaceMode = typeof import("../sibi/src/ownershipWorkbench/surfaceMode.ts");

const EXPECTED_DIFF_FILES = ["src/api/session.ts", "src/api/session.test.ts"] as const;
const DIRECTORY_PATHS = ["src", "src/api", "src/runtime"] as const;

let cachedFixtures: OwnershipWorkbenchFixtures | null = null;
let cachedHelpers: OwnershipWorkbenchHelpers | null = null;
let cachedSurfaceMode: OwnershipWorkbenchSurfaceMode | null = null;
let fixtureImportConsoleErrors: unknown[] = [];

async function loadFixturesModule(): Promise<OwnershipWorkbenchFixtures> {
  if (cachedFixtures != null) {
    return cachedFixtures;
  }

  const originalConsoleError = console.error;
  const capturedErrors: unknown[] = [];
  console.error = (...args: unknown[]) => {
    capturedErrors.push(args);
  };

  try {
    cachedFixtures = (await import("../sibi/src/ownershipWorkbench/fixtures.ts")) as OwnershipWorkbenchFixtures;
    fixtureImportConsoleErrors = capturedErrors;
    return cachedFixtures;
  } finally {
    console.error = originalConsoleError;
  }
}

async function loadHelpersModule(): Promise<OwnershipWorkbenchHelpers> {
  if (cachedHelpers != null) {
    return cachedHelpers;
  }

  cachedHelpers = (await import("../sibi/src/ownershipWorkbench/helpers.ts")) as OwnershipWorkbenchHelpers;
  return cachedHelpers;
}

async function loadSurfaceModeModule(): Promise<OwnershipWorkbenchSurfaceMode> {
  if (cachedSurfaceMode != null) {
    return cachedSurfaceMode;
  }

  cachedSurfaceMode = (await import("../sibi/src/ownershipWorkbench/surfaceMode.ts")) as OwnershipWorkbenchSurfaceMode;
  return cachedSurfaceMode;
}

test("fixture file tree paths only include leaf file paths", async () => {
  const fixtures = await loadFixturesModule();

  for (const directoryPath of DIRECTORY_PATHS) {
    assert.equal(
      fixtures.fileTreePaths.includes(directoryPath),
      false,
      `fileTreePaths should not include directory path: ${directoryPath}`,
    );
  }

  for (const path of fixtures.fileTreePaths) {
    const node = fixtures.fileTreeNodeByPath[path];
    assert.ok(node, `fileTreePaths entry ${path} has no node in fileTreeNodeByPath`);
    assert.equal(node.kind, "file", `fileTreePaths entry ${path} is not a file node`);
  }
});

test("fixture parse should be strict and expose the expected patch file names", async () => {
  const fixtures = await loadFixturesModule();
  const parsed = parsePatchFiles(fixtures.fixtureDiff, "sibi-slice-0", true);

  const parsedFileNames = parsed
    .flatMap((patch) => patch.files.map((file) => file.name))
    .sort();

  assert.deepEqual(parsedFileNames, [...EXPECTED_DIFF_FILES].sort());
});

test("codeViewDiffItemsByPath includes diff entries for expected files", async () => {
  const fixtures = await loadFixturesModule();

  for (const path of EXPECTED_DIFF_FILES) {
    assert.ok(
      path in fixtures.codeViewDiffItemsByPath,
      `codeViewDiffItemsByPath missing expected diff for ${path}`,
    );
  }
});

test("fixture import should not log console errors in the happy path", async () => {
  await loadFixturesModule();
  assert.equal(fixtureImportConsoleErrors.length, 0, "fixture import logged one or more console errors");
});

test("groupedEvidence groups fixture evidence by confidence", async () => {
  const fixtures = await loadFixturesModule();
  const helpers = await loadHelpersModule();
  const grouped = helpers.groupedEvidence(fixtures.fixtureEvidence);

  assert.deepEqual(
    Object.fromEntries(Object.entries(grouped).map(([confidence, entries]) => [confidence, entries.map((entry) => entry.id)])),
    {
      observed: ["E-001"],
      inferred: ["E-002"],
      unverified: ["E-003"],
      conflict: ["E-004"],
    },
  );
});

test("active ownership boundary state is projected from the boundary file state", async () => {
  const fixtures = await loadFixturesModule();
  const helpers = await loadHelpersModule();

  assert.equal(fixtures.ownershipBoundary.filePath, "src/api/session.ts");
  assert.equal(fixtures.initialFileStates[fixtures.ownershipBoundary.filePath], "gap");
  assert.equal(
    helpers.getActiveBoundaryState(fixtures.initialFileStates, fixtures.ownershipBoundary),
    "gap",
    "initial harness and lab state should match the file tree boundary file state",
  );
  assert.equal(
    helpers.getActiveBoundaryState({}, fixtures.ownershipBoundary),
    "unvisited",
    "missing boundary file state should fall back to unvisited",
  );
});

test("boundary state projection preserves evaluated states for tree, harness, and lab", async () => {
  const fixtures = await loadFixturesModule();
  const helpers = await loadHelpersModule();
  const evaluatedStates: BoundaryState[] = ["gap", "partial", "owned", "questionable"];

  for (const state of evaluatedStates) {
    const fileStates = helpers.withBoundaryFileState(
      fixtures.initialFileStates,
      fixtures.ownershipBoundary,
      state,
    );
    const treeState = helpers.getNodeState(
      fixtures.fileTreeNodeByPath[fixtures.ownershipBoundary.filePath],
      fileStates,
    );
    const activeBoundaryState = helpers.getActiveBoundaryState(fileStates, fixtures.ownershipBoundary);

    assert.equal(fileStates["src/api/session.ts"], state);
    assert.equal(treeState, state, `file tree should preserve ${state}`);
    assert.equal(activeBoundaryState, state, `harness and lab should preserve ${state}`);
    assert.equal(
      fileStates["src/api/session.test.ts"],
      fixtures.initialFileStates["src/api/session.test.ts"],
      "projecting the active boundary state should not rewrite sibling file states",
    );
  }
});

test("ownership review queue prioritizes touched boundary review before ownership prompt", async () => {
  const fixtures = await loadFixturesModule();

  assert.deepEqual(
    fixtures.ownershipReviewQueue.map((item) => item.filePath),
    ["src/api/session.ts", "src/api/session.test.ts", "src/runtime/consumer.ts"],
    "review queue should walk touched boundary, supporting test, then inferred caller evidence",
  );
  assert.deepEqual(
    fixtures.ownershipReviewQueue.map((item) => item.priority),
    [1, 2, 3],
    "review queue should expose deterministic priorities",
  );
  assert.equal(fixtures.ownershipReviewQueue[0]?.touched, true);
  assert.match(
    fixtures.ownershipReviewQueue[0]?.orderReason ?? "",
    /return contract/,
    "highest-priority queue item should explain why the touched boundary comes first",
  );
  assert.match(
    fixtures.ownershipReviewQueue[2]?.nextStep ?? "",
    /before asking for the ownership attempt/,
    "queue should make ownership attempt the next stage after boundary review",
  );
});

test("evidenceForSelection returns evidence overlapping the selected range", async () => {
  const fixtures = await loadFixturesModule();
  const helpers = await loadHelpersModule();

  assert.deepEqual(
    helpers
      .evidenceForSelection(fixtures.fixtureEvidence, "src/api/session.ts", {
        startLine: 12,
        endLine: 13,
      })
      .map((entry) => entry.id),
    ["E-001"],
  );

  assert.deepEqual(
    helpers.evidenceForSelection(fixtures.fixtureEvidence, "src/api/session.ts", {
      startLine: 9,
      endLine: 11,
    }),
    [],
  );

  assert.deepEqual(
    helpers
      .evidenceForSelection(fixtures.fixtureEvidence, "src/runtime/consumer.ts", {
        startLine: 41,
        endLine: 53,
      })
      .map((entry) => entry.id),
    ["E-002"],
  );

  assert.deepEqual(
    helpers.evidenceForSelection(fixtures.fixtureEvidence, "src/api/session.ts", {
      startLine: 20,
      endLine: 24,
    }),
    [],
  );
});

test("ReviewGuidePanel defines a first-run review sequence without free chat language", () => {
  const guideSource = readFileSync(
    new URL("../sibi/src/ownershipWorkbench/components/ReviewGuidePanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    guideSource,
    /aria-label="First-run review sequence"/,
    "ReviewGuidePanel should expose a first-run sequence landmark",
  );
  assert.match(
    guideSource,
    /Priority queue/,
    "ReviewGuidePanel should render a prioritized review queue",
  );
  assert.match(
    guideSource,
    /Touched[\s\S]*Reason[\s\S]*Next step/,
    "ReviewGuidePanel should show touched status, order reason, and next step",
  );
  assert.match(
    guideSource,
    /Request ownership attempt/,
    "ReviewGuidePanel should make the ownership prompt a stage of the sequence",
  );
  assert.doesNotMatch(
    guideSource,
    /ask anything|anything about|chat freely|free chat|chat libre/i,
    "ReviewGuidePanel must not frame the workbench as open chat",
  );
});

test("OwnershipHarnessPanel renders review guide before prompt and gates the local lab", () => {
  const harnessSource = readFileSync(
    new URL("../sibi/src/ownershipWorkbench/components/OwnershipHarnessPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    harnessSource,
    /import\s+\{\s*ReviewGuidePanel\s*\}\s+from\s+["']\.\/ReviewGuidePanel["']/,
    "OwnershipHarnessPanel should import the review guide subcomponent",
  );

  const guideIndex = harnessSource.indexOf("<ReviewGuidePanel");
  const promptIndex = harnessSource.indexOf("Ownership prompt");
  const labIndex = harnessSource.indexOf("<OwnershipLabPanel");

  assert.ok(guideIndex >= 0, "OwnershipHarnessPanel should render ReviewGuidePanel");
  assert.ok(promptIndex >= 0, "OwnershipHarnessPanel should still render the ownership prompt");
  assert.ok(labIndex >= 0, "OwnershipHarnessPanel should still define the local lab render path");
  assert.ok(guideIndex < promptIndex, "review guide should render before ownership prompt");
  assert.ok(promptIndex < labIndex, "ownership prompt should render before the secondary lab");
  assert.match(
    harnessSource,
    /const isLabView = surfaceMode === "lab" && labContext != null/,
    "OwnershipHarnessPanel should derive a lab-only render flag from the surface mode",
  );
  assert.match(
    harnessSource,
    /\{isLabView && \([\s\S]*<OwnershipLabPanel/,
    "OwnershipHarnessPanel should not render OwnershipLabPanel in the default user-facing view",
  );
  assert.match(
    harnessSource,
    /Local trace lab/,
    "OwnershipHarnessPanel should label the query-param view as a local trace lab",
  );
  assert.match(
    harnessSource,
    /reviewQueue=\{reviewQueue\}/,
    "OwnershipHarnessPanel should pass review queue data into ReviewGuidePanel",
  );
  assert.doesNotMatch(
    harnessSource,
    /ask anything|anything about|chat freely|free chat|chat libre/i,
    "OwnershipHarnessPanel must not frame the workbench as open chat",
  );
});

test("workbench surface mode is derived from local query params", async () => {
  const { getWorkbenchSurfaceMode } = await loadSurfaceModeModule();

  assert.equal(getWorkbenchSurfaceMode(""), "default");
  assert.equal(getWorkbenchSurfaceMode("?file=src/api/session.ts"), "default");
  assert.equal(getWorkbenchSurfaceMode("?view=lab"), "lab");
  assert.equal(getWorkbenchSurfaceMode("?lab=1"), "lab");
  assert.equal(getWorkbenchSurfaceMode("?view=review&lab=1"), "lab");
});

test("App passes a query-derived surface mode into the ownership harness", () => {
  const appSource = readFileSync(new URL("../sibi/src/App.tsx", import.meta.url), "utf8");

  assert.match(
    appSource,
    /import\s+\{\s*getWorkbenchSurfaceMode\s*\}\s+from\s+["']\.\/ownershipWorkbench\/surfaceMode["']/,
    "App should use the deterministic surface-mode helper",
  );
  assert.match(
    appSource,
    /getWorkbenchSurfaceMode\([\s\S]*window\.location\.search[\s\S]*\)/,
    "App should derive lab mode from the URL query string",
  );
  assert.match(
    appSource,
    /surfaceMode=\{workbenchSurfaceMode\}/,
    "App should pass the derived mode into OwnershipHarnessPanel",
  );
  assert.match(
    appSource,
    /workbenchSurfaceMode === "lab"[\s\S]*\? \{[\s\S]*evidenceRefs: fixtureEvidence[\s\S]*\}[\s\S]*: null/,
    "App should pass lab derivation context only in the query-param lab view",
  );
  assert.match(
    appSource,
    /labContext=\{labContext\}/,
    "App should pass the gated lab context into OwnershipHarnessPanel",
  );
});

test("ownership workbench CodeView adapter uses the React entrypoint", () => {
  assert.notEqual(
    PierreCodeView,
    VanillaCodeView,
    "Ownership Workbench must not render the vanilla CodeView constructor as JSX",
  );
  assert.equal(
    typeof (PierreCodeView as { prototype?: { setup?: unknown } }).prototype?.setup,
    "undefined",
    "React CodeView adapter should not expose the vanilla CodeView instance API on its prototype",
  );
});

test("CodeDiffPanel renders the CodeView adapter instead of vanilla CodeView", () => {
  const source = readFileSync(
    new URL("../sibi/src/ownershipWorkbench/components/CodeDiffPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /import\s+\{\s*PierreCodeView\s*\}\s+from\s+["']\.\/PierreCodeView["']/,
    "CodeDiffPanel should import the ownership workbench CodeView adapter",
  );
  assert.doesNotMatch(
    source,
    /import\s+(?!type\b)[\s\S]*?\bCodeView\b[\s\S]*?\bfrom\s+["']@pierre\/diffs["']/,
    "CodeDiffPanel must not import the vanilla CodeView from @pierre/diffs",
  );
  assert.doesNotMatch(
    source,
    /<CodeView(?:[\s>]|<)/,
    "CodeDiffPanel must not render the vanilla CodeView JSX element",
  );
  assert.match(
    source,
    /<PierreCodeView(?:[\s>]|<)/,
    "CodeDiffPanel should render the ownership workbench CodeView adapter",
  );
});

test("OwnershipHarnessPanel wires a local derivation lab contract", () => {
  const harnessSource = readFileSync(
    new URL("../sibi/src/ownershipWorkbench/components/OwnershipHarnessPanel.tsx", import.meta.url),
    "utf8",
  );
  const labSource = readFileSync(
    new URL("../sibi/src/ownershipWorkbench/components/OwnershipLabPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    harnessSource,
    /import\s+\{\s*OwnershipLabPanel\s*\}\s+from\s+["']\.\/OwnershipLabPanel["']/,
    "OwnershipHarnessPanel should import the selection lab subcomponent",
  );
  assert.match(
    harnessSource,
    /<OwnershipLabPanel[\s\S]*selectedFile=\{labContext\.selectedFile\}[\s\S]*viewMode=\{labContext\.viewMode\}[\s\S]*selection=\{labContext\.selection\}[\s\S]*selectionSummaryText=\{labContext\.selectionSummaryText\}[\s\S]*boundary=\{boundary\}[\s\S]*boundaryState=\{boundaryState\}[\s\S]*evidenceRefs=\{labContext\.evidenceRefs\}/,
    "OwnershipHarnessPanel should pass the selection contract through to the lab",
  );

  for (const propName of [
    "selectedFile",
    "viewMode",
    "selection",
    "selectionSummaryText",
    "boundary",
    "boundaryState",
    "evidenceRefs",
  ]) {
    assert.match(labSource, new RegExp(`${propName}:`), `OwnershipLabPanel props should include ${propName}`);
  }
  assert.match(labSource, /evidenceForSelection/, "OwnershipLabPanel should derive line-matched evidence");
  assert.match(
    labSource,
    /User-facing state/,
    "OwnershipLabPanel should label the projected state as the user-facing state input",
  );
  assert.match(
    labSource,
    /State source/,
    "OwnershipLabPanel should name the state source instead of showing a standalone public badge",
  );
  assert.match(
    labSource,
    /fileStates\[boundary\.filePath\][\s\S]*active boundary state[\s\S]*attempt gate/,
    "OwnershipLabPanel should describe the local state derivation path",
  );
  assert.match(
    labSource,
    /No range selected; showing active boundary context\./,
    "OwnershipLabPanel should not describe an absent selection as an out-of-bound selected range",
  );
  assert.doesNotMatch(
    labSource,
    /boundary\.returnCondition/,
    "OwnershipLabPanel should not reveal the return condition before an attempt",
  );
});
