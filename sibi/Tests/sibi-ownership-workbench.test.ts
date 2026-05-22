import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CodeView as VanillaCodeView, parsePatchFiles } from "@pierre/diffs";
import { PierreCodeView } from "../src/ownershipWorkbench/components/PierreCodeView.ts";
import type { BoundaryState } from "../src/ownershipWorkbench/types.ts";

type OwnershipWorkbenchFixtures = typeof import("../src/ownershipWorkbench/fixtures.ts");
type OwnershipWorkbenchHelpers = typeof import("../src/ownershipWorkbench/helpers.ts");
type OwnershipReviewSession = typeof import("../src/ownershipWorkbench/ownershipReviewSession.ts");
type OwnershipWorkbenchSurfaceMode = typeof import("../src/ownershipWorkbench/surfaceMode.ts");
type OwnershipEvidenceExtraction = typeof import("../src/ownershipWorkbench/evidenceExtraction.ts");

const EXPECTED_DIFF_FILES = ["src/api/session.ts", "src/api/session.test.ts"] as const;
const DIRECTORY_PATHS = ["src", "src/api", "src/runtime"] as const;

let cachedFixtures: OwnershipWorkbenchFixtures | null = null;
let cachedHelpers: OwnershipWorkbenchHelpers | null = null;
let cachedReviewSession: OwnershipReviewSession | null = null;
let cachedSurfaceMode: OwnershipWorkbenchSurfaceMode | null = null;
let cachedEvidenceExtraction: OwnershipEvidenceExtraction | null = null;
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
    cachedFixtures = (await import("../src/ownershipWorkbench/fixtures.ts")) as OwnershipWorkbenchFixtures;
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

  cachedHelpers = (await import("../src/ownershipWorkbench/helpers.ts")) as OwnershipWorkbenchHelpers;
  return cachedHelpers;
}

async function loadSurfaceModeModule(): Promise<OwnershipWorkbenchSurfaceMode> {
  if (cachedSurfaceMode != null) {
    return cachedSurfaceMode;
  }

  cachedSurfaceMode = (await import("../src/ownershipWorkbench/surfaceMode.ts")) as OwnershipWorkbenchSurfaceMode;
  return cachedSurfaceMode;
}

async function loadReviewSessionModule(): Promise<OwnershipReviewSession> {
  if (cachedReviewSession != null) {
    return cachedReviewSession;
  }

  cachedReviewSession = (await import("../src/ownershipWorkbench/ownershipReviewSession.ts")) as OwnershipReviewSession;
  return cachedReviewSession;
}

async function loadEvidenceExtractionModule(): Promise<OwnershipEvidenceExtraction> {
  if (cachedEvidenceExtraction != null) {
    return cachedEvidenceExtraction;
  }

  cachedEvidenceExtraction = (await import("../src/ownershipWorkbench/evidenceExtraction.ts")) as OwnershipEvidenceExtraction;
  return cachedEvidenceExtraction;
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

test("ownership review session asks file-specific and relation-specific questions", async () => {
  const fixtures = await loadFixturesModule();
  const session = await loadReviewSessionModule();
  const questions = session.makeOwnershipSessionQuestions(fixtures.ownershipReviewQueue);

  assert.match(questions[0]?.prompt ?? "", /Repasá `src\/api\/session\.ts`/);
  assert.match(
    questions[1]?.prompt ?? "",
    /Conectá `src\/api\/session\.test\.ts` con `src\/api\/session\.ts`/,
    "test step should ask for a relationship, not a file summary",
  );
  assert.match(
    questions[2]?.prompt ?? "",
    /conectá `src\/runtime\/consumer\.ts` con `src\/api\/session\.ts`/i,
    "consumer step should ask for the caller/API relationship",
  );
});

test("ownership review session advances on empty and mark-unknown attempts", async () => {
  const fixtures = await loadFixturesModule();
  const session = await loadReviewSessionModule();
  const questions = session.makeOwnershipSessionQuestions(fixtures.ownershipReviewQueue);
  const initialState = session.createOwnershipSessionState();

  const emptyResult = session.advanceOwnershipSession(initialState, questions, "", "submit");
  assert.equal(emptyResult.kind, "advanced");
  assert.equal(emptyResult.state.currentIndex, 1);
  assert.equal(emptyResult.state.observations[0]?.reason, "no answer");

  const unknownResult = session.advanceOwnershipSession(initialState, questions, "ignored", "mark_unknown");
  assert.equal(unknownResult.kind, "advanced");
  assert.equal(unknownResult.state.currentIndex, 1);
  assert.equal(unknownResult.state.observations[0]?.reason, "no answer");
});

test("ownership review session advances valid answers without recording observations", async () => {
  const fixtures = await loadFixturesModule();
  const session = await loadReviewSessionModule();
  const questions = session.makeOwnershipSessionQuestions(fixtures.ownershipReviewQueue);
  const initialState = session.createOwnershipSessionState();

  const result = session.advanceOwnershipSession(
    initialState,
    questions,
    "The 204 branch returns null instead of JSON, so callers need to handle the new null contract.",
    "submit",
  );

  assert.equal(result.kind, "advanced");
  assert.equal(result.state.currentIndex, 1);
  assert.equal(result.state.isComplete, false);
  assert.equal(result.state.observations.length, 0);
  assert.equal(result.state.lastFeedback, "Respuesta aceptada. Sibi avanza al siguiente check.");
});

test("ownership review session records relation gaps and opens hint ladder after two weak attempts", async () => {
  const fixtures = await loadFixturesModule();
  const session = await loadReviewSessionModule();
  const questions = session.makeOwnershipSessionQuestions(fixtures.ownershipReviewQueue);
  const initialState = session.createOwnershipSessionState();

  const first = session.advanceOwnershipSession(initialState, questions, "", "submit");
  assert.equal(first.kind, "advanced");
  const second = session.advanceOwnershipSession(
    first.state,
    questions,
    "The test exists but I cannot connect it yet.",
    "submit",
  );

  assert.equal(second.kind, "advanced");
  assert.equal(second.state.currentIndex, 2);
  assert.equal(second.state.showHintLadder, true);
  assert.equal(second.state.observations[1]?.reason, "could not connect caller/test");
});

test("ownership review session completes on a valid final answer", async () => {
  const fixtures = await loadFixturesModule();
  const session = await loadReviewSessionModule();
  const questions = session.makeOwnershipSessionQuestions(fixtures.ownershipReviewQueue);
  const finalState = {
    ...session.createOwnershipSessionState(),
    currentIndex: questions.length - 1,
  };

  const result = session.advanceOwnershipSession(
    finalState,
    questions,
    "consumer.ts must branch on createSession returning null from session.ts and keep the user unauthenticated without privileged calls.",
    "submit",
  );

  assert.equal(result.kind, "complete");
  assert.equal(result.state.isComplete, true);
  assert.equal(result.state.currentIndex, questions.length - 1);
  assert.equal(result.state.observations.length, 0);
  assert.match(result.feedback, /session complete/i);
});

test("ownership review session completes with a final observation on weak last answer", async () => {
  const fixtures = await loadFixturesModule();
  const session = await loadReviewSessionModule();
  const questions = session.makeOwnershipSessionQuestions(fixtures.ownershipReviewQueue);
  const finalState = {
    ...session.createOwnershipSessionState(),
    currentIndex: questions.length - 1,
    weakAttemptStreak: 1,
  };

  const result = session.advanceOwnershipSession(finalState, questions, "Still unsure.", "submit");

  assert.equal(result.kind, "complete");
  assert.equal(result.state.isComplete, true);
  assert.equal(result.state.currentIndex, questions.length - 1);
  assert.equal(result.observation?.reason, "inconclusive");
  assert.equal(result.state.observations[0]?.filePath, "src/runtime/consumer.ts");
  assert.match(result.feedback, /Gap final registrado/);
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

test("relation navigation derives possible test/caller/doc links for touched file", async () => {
  const fixtures = await loadFixturesModule();
  const helpers = await loadHelpersModule();

  const links = helpers.getRelationNavigationTargets(
    "src/api/session.ts",
    fixtures.ownershipReviewQueue,
    fixtures.fixtureEvidence,
  );
  const kinds = links.map((link) => link.kind);
  const paths = links.map((link) => link.path);

  assert.equal(kinds.includes("possible test"), true, "session.ts should suggest a possible test relation");
  assert.equal(kinds.includes("possible caller"), true, "session.ts should suggest a possible caller relation");
  assert.equal(paths.includes("src/api/session.test.ts"), true);
  assert.equal(paths.includes("src/runtime/consumer.ts"), true);
  assert.equal(links.some((link) => link.source === "fallback"), false);
});

test("relation navigation falls back to explicit missing relation", async () => {
  const helpers = await loadHelpersModule();
  const links = helpers.getRelationNavigationTargets("src/unknown.ts", [], []);

  assert.equal(links.length, 1);
  assert.equal(links[0].kind, "missing relation");
  assert.equal(links[0].path, "missing relation");
});

test("extractCodeEvidence detects observed imports, exports, and symbols from session fixture", async () => {
  const fixtures = await loadFixturesModule();
  const extractor = await loadEvidenceExtractionModule();

  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/api/session.ts",
    fileFixtures: fixtures.fileFixtures,
    evidenceRefs: fixtures.fixtureEvidence,
    reviewQueue: fixtures.ownershipReviewQueue,
  });

  const importText = evidence.imports.map((entry) => entry.text.trim());
  const exportText = evidence.exports.map((entry) => entry.text.trim());
  const symbolText = evidence.symbols.map((entry) => entry.text.trim());

  assert.equal(importText.includes('import type { LoginPayload } from "./types";'), true);
  assert.equal(exportText.some((line) => line.includes("export async function createSession")), true);
  assert.equal(symbolText.some((line) => line.includes("createSession")), true);
  assert.equal(evidence.imports.length >= 1, true);
  assert.equal(evidence.exports.length >= 1, true);
  assert.equal(evidence.symbols.length >= 1, true);
});

test("extractCodeEvidence detects nearby test and caller candidates from queue/evidence", async () => {
  const fixtures = await loadFixturesModule();
  const extractor = await loadEvidenceExtractionModule();

  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/api/session.ts",
    fileFixtures: fixtures.fileFixtures,
    evidenceRefs: fixtures.fixtureEvidence,
    reviewQueue: fixtures.ownershipReviewQueue,
  });

  const kinds = evidence.relationCandidates.map((candidate) => candidate.kind).sort();

  assert.equal(kinds.includes("test"), true, "session.ts should detect nearby test candidates");
  assert.equal(kinds.includes("caller"), true, "session.ts should detect caller candidates");
  assert.equal(
    evidence.relationCandidates.every((candidate) => candidate.sourceIds.length > 0),
    true,
    "relation candidates should include source IDs",
  );
});

test("extractCodeEvidence preserves conflict candidates when deduping relation paths", async () => {
  const extractor = await loadEvidenceExtractionModule();
  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/api/session.ts",
    fileFixtures: {
      "src/api/session.ts": `export function createSession() {
  return null;
}`,
    },
    evidenceRefs: [
      {
        id: "R-observed",
        title: "Observed caller",
        detail: "Direct caller evidence.",
        location: "src/runtime/consumer.ts:10",
        confidence: "observed",
      },
      {
        id: "R-conflict",
        title: "Conflicting caller",
        detail: "Contradictory caller evidence.",
        location: "src/runtime/consumer.ts:22",
        confidence: "conflict",
      },
    ],
    reviewQueue: [],
  });

  const candidate = evidence.relationCandidates.find(
    (entry) => entry.kind === "caller" && entry.path === "src/runtime/consumer.ts",
  );

  assert.equal(candidate?.evidenceKind, "conflict", "conflict evidence should survive relation candidate dedupe");
  assert.deepEqual(
    candidate?.sourceIds.sort(),
    ["R-conflict", "R-observed"].sort(),
    "deduped conflict candidate should keep both evidence sources",
  );
});

test("extractCodeEvidence emits missing relation gaps when runtime/caller support is absent", async () => {
  const extractor = await loadEvidenceExtractionModule();
  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/standalone/runtime.ts",
    fileFixtures: {
      "src/standalone/runtime.ts": `export function loadRuntimeState() {
  return { value: true };
}`,
    },
    evidenceRefs: [],
    reviewQueue: [],
  });

  assert.equal(
    evidence.relationGaps.some((gap) => gap.type === "missing runtime contract"),
    true,
    "runtime-supporting file without evidence should surface an explicit runtime gap",
  );
  assert.equal(
    evidence.relationGaps.some((gap) => gap.sourceIds.length > 0),
    true,
    "relation gaps should expose source IDs to support downgrade behavior",
  );
});

test("extractCodeEvidence adds an explicit missing-caller fallback candidate", async () => {
  const extractor = await loadEvidenceExtractionModule();
  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/services/runtime.ts",
    fileFixtures: {
      "src/services/runtime.ts": `export function parseRuntimeBoundary() {
  return { valid: false };
}`,
    },
    evidenceRefs: [],
    reviewQueue: [],
  });

  const missingCallerGap = evidence.relationGaps.find((gap) => gap.type === "missing caller");
  const missingCallerCandidate = evidence.relationCandidates.find(
    (candidate) => candidate.kind === "caller" && candidate.path === "missing-caller",
  );

  assert.equal(missingCallerGap != null, true, "caller gap should surface without direct caller evidence");
  assert.equal(missingCallerGap?.id, "src/services/runtime.ts:gap:missing-caller", "caller gap id should use a stable slug");
  assert.equal(
    missingCallerGap?.candidateReason,
    "Expected caller relation is not confirmed for src/services/runtime.ts.",
    "caller gap reason should avoid duplicate missing wording",
  );
  assert.equal(missingCallerCandidate != null, true, "missing caller should be represented as fallback candidate");
  assert.equal(missingCallerCandidate?.source, "fallback", "missing-caller fallback should be sourced as fallback");
  assert.equal(missingCallerCandidate?.evidenceKind, "unverified", "missing-caller fallback should be unverified");
  assert.equal(
    missingCallerCandidate?.sourceIds.includes(missingCallerGap?.id ?? ""),
    true,
    "missing-caller fallback should reference the originating missing-caller gap",
  );
  assert.equal(missingCallerCandidate?.sourceIds.includes("src/services/runtime.ts"), true, "fallback should include file context");
});

test("extractCodeEvidence downgrades unsupported missing claims when only weak hints exist", async () => {
  const extractor = await loadEvidenceExtractionModule();
  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/services/runtime.ts",
    fileFixtures: {
      "src/services/runtime.ts": `export function parseRuntimeBoundary() {
  return { valid: false };
}`,
    },
    evidenceRefs: [
      {
        id: "R-001",
        title: "Boundary notes",
        detail: "This note is not direct evidence and only sketches ownership context.",
        location: "docs/notes/runtime.md:1-3",
        confidence: "unverified",
      },
    ],
    reviewQueue: [],
  });

  assert.equal(evidence.relationGaps.some((gap) => gap.type === "missing caller"), true, "caller gap should surface without direct caller evidence");
  assert.equal(evidence.relationGaps.some((gap) => gap.type === "missing test path"), true, "test-path gap should surface without direct test evidence");
  assert.equal(evidence.relationGaps.some((gap) => gap.type === "missing runtime contract"), true, "runtime gap should surface without runtime evidence");
  assert.equal(
    evidence.relationGaps.every((gap) => gap.downgrade != null),
    true,
    "all missing-gap entries should be downgraded for weak/indirect support",
  );
  assert.equal(
    evidence.relationGaps.every((gap) => gap.downgrade?.to === "unverified"),
    true,
    "downgrade should move weak signals to question-grade confidence",
  );
});

test("extractCodeEvidence infers runtime-contract gaps from runtime boundary text before downgrading", async () => {
  const extractor = await loadEvidenceExtractionModule();
  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/services/sessionBoundary.ts",
    fileFixtures: {
      "src/services/sessionBoundary.ts": `export async function fetchSessionBoundary() {
  return fetch("/api/session");
}`,
    },
    evidenceRefs: [],
    reviewQueue: [],
  });

  const runtimeGap = evidence.relationGaps.find((gap) => gap.type === "missing runtime contract");

  assert.equal(runtimeGap?.id, "src/services/sessionBoundary.ts:gap:missing-runtime-contract");
  assert.equal(runtimeGap?.evidenceKind, "unverified");
  assert.equal(runtimeGap?.confidence, "unverified");
  assert.equal(runtimeGap?.downgrade?.from, "inferred");
  assert.equal(runtimeGap?.downgrade?.to, "unverified");
});

test("extractCodeEvidence does not require runtime contract for test files by default", async () => {
  const extractor = await loadEvidenceExtractionModule();
  const evidence = extractor.extractCodeEvidence({
    selectedFile: "src/services/session.test.ts",
    fileFixtures: {
      "src/services/session.test.ts": `import { parseSession } from "./session";

test("returns null session", () => {
  expect(parseSession()).toBeNull();
});
`,
    },
    evidenceRefs: [],
    reviewQueue: [],
  });

  assert.equal(
    evidence.relationGaps.some((gap) => gap.type === "missing runtime contract"),
    false,
    "test files should not trigger missing runtime by default",
  );
});

test("ReviewGuidePanel defines a first-run review sequence without free chat language", () => {
  const guideSource = readFileSync(
    new URL("../src/ownershipWorkbench/components/ReviewGuidePanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    guideSource,
    /aria-label="First-run review sequence"/,
    "ReviewGuidePanel should expose a first-run sequence landmark",
  );
  assert.match(
    guideSource,
    /Current queue focus/,
    "ReviewGuidePanel should expose a compact current queue focus in the default path",
  );
  assert.match(
    guideSource,
    /Start here[\s\S]*Next action/,
    "ReviewGuidePanel should show why the current item starts first and the next action",
  );
  assert.match(
    guideSource,
    /Later: request the ownership attempt/,
    "ReviewGuidePanel should make the ownership prompt a later stage of the sequence",
  );
  assert.doesNotMatch(
    guideSource,
    /ask anything|anything about|chat freely|free chat|chat libre/i,
    "ReviewGuidePanel must not frame the workbench as open chat",
  );
});

test("ReviewGuidePanel gates detailed priority queue behind lab mode", () => {
  const guideSource = readFileSync(
    new URL("../src/ownershipWorkbench/components/ReviewGuidePanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    guideSource,
    /showDetailedQueue\?: boolean/,
    "ReviewGuidePanel should accept a flag for the detailed lab queue",
  );
  assert.match(
    guideSource,
    /showDetailedQueue = false/,
    "ReviewGuidePanel should default to the compact user-facing queue",
  );
  assert.match(
    guideSource,
    /\{showDetailedQueue && \([\s\S]*Priority queue[\s\S]*reviewQueue\.map/,
    "ReviewGuidePanel should only render the full priority queue when requested",
  );
  assert.match(
    guideSource,
    /Touched[\s\S]*Reason[\s\S]*Next step/,
    "the detailed lab queue should show touched status, order reason, and next step",
  );
  assert.match(
    guideSource,
    /const currentItem = reviewQueue\[0\]/,
    "the compact default path should focus on only the first queue item",
  );
});

test("OwnershipHarnessPanel renders review guide before guided session and gates the local lab", () => {
  const harnessSource = readFileSync(
    new URL("../src/ownershipWorkbench/components/OwnershipHarnessPanel.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    harnessSource,
    /import\s+\{\s*ReviewGuidePanel\s*\}\s+from\s+["']\.\/ReviewGuidePanel["']/,
    "OwnershipHarnessPanel should import the review guide subcomponent",
  );

  const guideIndex = harnessSource.indexOf("<ReviewGuidePanel");
  const sessionIndex = harnessSource.indexOf("Guided ownership review session");
  const labIndex = harnessSource.indexOf("<OwnershipLabPanel");

  assert.ok(guideIndex >= 0, "OwnershipHarnessPanel should render ReviewGuidePanel");
  assert.ok(sessionIndex >= 0, "OwnershipHarnessPanel should render the guided ownership session");
  assert.ok(labIndex >= 0, "OwnershipHarnessPanel should still define the local lab render path");
  assert.ok(guideIndex < sessionIndex, "review guide should render before guided session");
  assert.ok(sessionIndex < labIndex, "guided session should render before the secondary lab");
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
  assert.match(
    harnessSource,
    /showDetailedQueue=\{isLabView\}/,
    "OwnershipHarnessPanel should reserve the full priority queue for lab mode",
  );
  assert.match(
    harnessSource,
    /const currentQuestion = sessionState\.isComplete \? null : sessionQuestions\[sessionState\.currentIndex\] \?\? null/,
    "OwnershipHarnessPanel should derive the current step from deterministic session questions and hide it after completion",
  );
  assert.doesNotMatch(
    harnessSource,
    /ask anything|anything about|chat freely|free chat|chat libre/i,
    "OwnershipHarnessPanel must not frame the workbench as open chat",
  );
});

test("workbench CSS gives the ownership harness a wide primary desktop column", () => {
  const styles = readFileSync(new URL("../src/styles.css", import.meta.url), "utf8");

  assert.match(
    styles,
    /grid-template-columns:\s*248px minmax\(430px, 1fr\) minmax\(460px, 32vw\);/,
    "desktop layout should reserve a wide responsive column for the ownership harness",
  );
  assert.match(
    styles,
    /\.ownershipPanel\s*\{[\s\S]*box-shadow:/,
    "ownership harness panel should have stronger visual presence than a passive metadata rail",
  );
  assert.match(
    styles,
    /\.ownershipSession\s*\{[\s\S]*margin: 14px;[\s\S]*box-shadow:/,
    "guided ownership session should read as the primary interaction surface inside the harness",
  );
  assert.match(
    styles,
    /\.attemptField textarea\s*\{[\s\S]*min-height: 150px;/,
    "ownership attempt textarea should be large enough for the guided attempt",
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
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

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
  assert.match(
    appSource,
    /makeOwnershipSessionQuestions\(ownershipReviewQueue\)/,
    "App should build the guided session from the deterministic review queue",
  );
  assert.match(
    appSource,
    /advanceOwnershipSession\(sessionState, sessionQuestions, attemptText, action\)/,
    "App should advance the guided session through the pure state machine helper",
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
    new URL("../src/ownershipWorkbench/components/CodeDiffPanel.tsx", import.meta.url),
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
  assert.match(
    source,
    /relationEvidence\.relationCandidates\.map\(\(candidate\) => \(/,
    "CodeDiffPanel should render extracted relationCandidates to the evidence UI",
  );
  assert.match(
    source,
    /candidate\.path/,
    "CodeDiffPanel relation candidate rendering should include candidate.path",
  );
  assert.match(
    source,
    /candidate\.label|candidate\.source/,
    "CodeDiffPanel relation candidate rendering should include candidate label and source",
  );
  assert.match(
    source,
    /\(\{candidate\.source\}\) \{candidate\.label\}/,
    "CodeDiffPanel relation candidate rendering should include candidate label and source together",
  );
});

test("OwnershipHarnessPanel wires a local derivation lab contract", () => {
  const harnessSource = readFileSync(
    new URL("../src/ownershipWorkbench/components/OwnershipHarnessPanel.tsx", import.meta.url),
    "utf8",
  );
  const labSource = readFileSync(
    new URL("../src/ownershipWorkbench/components/OwnershipLabPanel.tsx", import.meta.url),
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
