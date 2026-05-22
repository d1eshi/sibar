import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { CodeView as VanillaCodeView, parsePatchFiles } from "@pierre/diffs";
import { PierreCodeView } from "../src/ownershipWorkbench/components/PierreCodeView.ts";
import type { BoundaryState, OwnershipBoundary } from "../src/ownershipWorkbench/types.ts";

type OwnershipWorkbenchFixtures = typeof import("../src/ownershipWorkbench/fixtures.ts");
type OwnershipWorkbenchHelpers = typeof import("../src/ownershipWorkbench/helpers.ts");
type OwnershipReviewSession = typeof import("../src/ownershipWorkbench/ownershipReviewSession.ts");
type OwnershipWorkbenchSurfaceMode = typeof import("../src/ownershipWorkbench/surfaceMode.ts");
type OwnershipEvidenceExtraction = typeof import("../src/ownershipWorkbench/evidenceExtraction.ts");
type OwnershipAttemptReadiness = typeof import("../src/ownershipWorkbench/attemptReadiness.ts");
type OwnershipWorkspaceEscalation = typeof import("../src/ownershipWorkbench/workspaceEscalation.ts");
type OwnershipBoundaryBuilder = typeof import("../src/ownershipWorkbench/boundaryBuilder.ts");
type OwnershipTreeReasonFormatting = typeof import("../src/ownershipWorkbench/fileTreeReasonFormatting.ts");
type OwnershipTransferVerification = typeof import("../src/ownershipWorkbench/transferVerification.ts");
type OwnershipMemory = typeof import("../src/ownershipWorkbench/ownershipMemory.ts");

const EXPECTED_DIFF_FILES = ["src/api/session.ts", "src/api/session.test.ts"] as const;
const DIRECTORY_PATHS = ["src", "src/api", "src/runtime"] as const;

let cachedFixtures: OwnershipWorkbenchFixtures | null = null;
let cachedHelpers: OwnershipWorkbenchHelpers | null = null;
let cachedReviewSession: OwnershipReviewSession | null = null;
let cachedSurfaceMode: OwnershipWorkbenchSurfaceMode | null = null;
let cachedEvidenceExtraction: OwnershipEvidenceExtraction | null = null;
let cachedAttemptReadiness: OwnershipAttemptReadiness | null = null;
let cachedWorkspaceEscalation: OwnershipWorkspaceEscalation | null = null;
let cachedBoundaryBuilder: OwnershipBoundaryBuilder | null = null;
let cachedFileTreeReasonFormatting: OwnershipTreeReasonFormatting | null = null;
let cachedTransferVerification: OwnershipTransferVerification | null = null;
let cachedOwnershipMemory: OwnershipMemory | null = null;
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

async function loadAttemptReadinessModule(): Promise<OwnershipAttemptReadiness> {
  if (cachedAttemptReadiness != null) {
    return cachedAttemptReadiness;
  }

  cachedAttemptReadiness = (await import("../src/ownershipWorkbench/attemptReadiness.ts")) as OwnershipAttemptReadiness;
  return cachedAttemptReadiness;
}

async function loadWorkspaceEscalationModule(): Promise<OwnershipWorkspaceEscalation> {
  if (cachedWorkspaceEscalation != null) {
    return cachedWorkspaceEscalation;
  }

  cachedWorkspaceEscalation = (await import("../src/ownershipWorkbench/workspaceEscalation.ts")) as OwnershipWorkspaceEscalation;
  return cachedWorkspaceEscalation;
}

async function loadBoundaryBuilderModule(): Promise<OwnershipBoundaryBuilder> {
  if (cachedBoundaryBuilder != null) {
    return cachedBoundaryBuilder;
  }

  cachedBoundaryBuilder = (await import("../src/ownershipWorkbench/boundaryBuilder.ts")) as OwnershipBoundaryBuilder;
  return cachedBoundaryBuilder;
}

async function loadFileTreeReasonFormattingModule(): Promise<OwnershipTreeReasonFormatting> {
  if (cachedFileTreeReasonFormatting != null) {
    return cachedFileTreeReasonFormatting;
  }

  cachedFileTreeReasonFormatting = (await import("../src/ownershipWorkbench/fileTreeReasonFormatting.ts")) as OwnershipTreeReasonFormatting;
  return cachedFileTreeReasonFormatting;
}

async function loadTransferVerificationModule(): Promise<OwnershipTransferVerification> {
  if (cachedTransferVerification != null) {
    return cachedTransferVerification;
  }

  cachedTransferVerification = (await import("../src/ownershipWorkbench/transferVerification.ts")) as OwnershipTransferVerification;
  return cachedTransferVerification;
}

async function loadOwnershipMemoryModule(): Promise<OwnershipMemory> {
  if (cachedOwnershipMemory != null) {
    return cachedOwnershipMemory;
  }

  cachedOwnershipMemory = (await import("../src/ownershipWorkbench/ownershipMemory.ts")) as OwnershipMemory;
  return cachedOwnershipMemory;
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

test("attempt readiness gate captures evidence fit, timing, and anti-overconfidence", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const boundary = {
    ...fixtures.ownershipBoundary,
    evidence: fixtures.fixtureEvidence.filter((entry) => entry.id === "E-001" || entry.id === "E-002"),
  };
  const attemptText =
    "Null returns and the call must block privileged work when missing.";

  const antiOverConfidentAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText,
    boundary,
    selfConfidence: 95,
    attemptIndex: 1,
    startedAt: 10_000,
    submittedAt: 10_700,
  });

  assert.equal(antiOverConfidentAttempt.state, "partial");
  assert.equal(antiOverConfidentAttempt.readiness_gate, "repair-needed");
  assert.equal(antiOverConfidentAttempt.evidence_fit, 0.5);
  assert.equal(antiOverConfidentAttempt.calibration_score, 0.55);
  assert.equal(antiOverConfidentAttempt.gapDiagnoses.length > 0, true);
  assert.equal(antiOverConfidentAttempt.gapDiagnoses[0]?.evidenceRefs.length > 0, true);
  assert.equal(antiOverConfidentAttempt.elapsedMs, 700);
  assert.equal(typeof antiOverConfidentAttempt.attempt_id, "string");

  const calibratedAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch can return null; callers must guard with `if (!session)` before any privileged request and unauthenticated flows stop here.",
    boundary,
    selfConfidence: 62,
    attemptIndex: 2,
    startedAt: 20_000,
    submittedAt: 20_450,
  });

  assert.equal(calibratedAttempt.state, "owned");
  assert.equal(calibratedAttempt.readiness_gate, "ready");
  assert.equal(calibratedAttempt.attempt_id.startsWith(`attempt-${fixtures.ownershipBoundary.id}-02-`), true);
});

test("attempt readiness forces partial state when readiness gate fails but attempt is owned", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const boundary = {
    ...fixtures.ownershipBoundary,
    evidence: fixtures.fixtureEvidence.filter((entry) => entry.id === "E-001" || entry.id === "E-002"),
  };
  const ownershipWithoutReadiness = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText: "Null returns and the call must block privileged work when missing.",
    boundary,
    selfConfidence: 5,
    attemptIndex: 3,
    startedAt: 33_000,
    submittedAt: 33_450,
  });

  assert.equal(ownershipWithoutReadiness.state, "partial");
  assert.equal(ownershipWithoutReadiness.readiness_gate, "repair-needed");
  assert.equal(ownershipWithoutReadiness.gapReason, "Attempt met ownership heuristics but readiness confidence/evidence thresholds are not met.");
  assert.equal(ownershipWithoutReadiness.gapDiagnoses.length > 0, true);
  assert.equal(ownershipWithoutReadiness.smallestRepair.includes("Lower confidence"), true);
});

test("attempt readiness blocks owned state when confidence evidence gap is too high", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();

  const weakEvidenceAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText: "I don't know.",
    boundary: fixtures.ownershipBoundary,
    selfConfidence: 70,
    attemptIndex: 1,
    startedAt: 1000,
    submittedAt: 1100,
  });

  assert.equal(weakEvidenceAttempt.state, "gap");
  assert.equal(weakEvidenceAttempt.readiness_gate !== "ready", true);
  assert.equal(weakEvidenceAttempt.evidence_fit < 0.45, true);
  assert.equal(weakEvidenceAttempt.gapDiagnoses.length > 0, true);
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

test("transfer probe chooses a deterministic nearby boundary and captures required transfer contract fields", async () => {
  const fixtures = await loadFixturesModule();
  const transferVerification = await loadTransferVerificationModule();
  const probe = transferVerification.makeTransferProbe(
    fixtures.ownershipBoundary,
    fixtures.ownershipReviewQueue,
  );

  assert.equal(probe.required, true);
  assert.equal(probe.sourceBoundaryFile, fixtures.ownershipBoundary.filePath);
  assert.equal(probe.relatedBoundaryFile, "src/runtime/consumer.ts");
  assert.equal(probe.sourceBoundaryTitle, fixtures.ownershipBoundary.title);
  assert.equal(probe.relatedBoundaryTitle, "Caller contract for unauthenticated runtime paths");
  assert.equal(probe.required, true);
  assert.match(probe.id, /^probe-boundary-01-/);
  assert.match(
    probe.question,
    /Transfer this boundary contract from session to consumer\./,
  );
});

test("transfer attempt contract classifies pass/fail/skip with recurrence and follow-up tasks", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const transferVerification = await loadTransferVerificationModule();

  const boundary = {
    ...fixtures.ownershipBoundary,
    evidence: fixtures.fixtureEvidence,
  };
  const passText =
    "In consumer, transfer the caller guard from session by checking `if (!session)` before privileged paths; this keeps the null contract equivalent across both boundary locations.";
  const failText = "I am not sure why this is related.";
  const readyAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText: passText,
    boundary,
    selfConfidence: 62,
    attemptIndex: 1,
    startedAt: 10_000,
    submittedAt: 10_500,
  });

  const probe = transferVerification.makeTransferProbe(boundary, fixtures.ownershipReviewQueue);
  assert.equal(readyAttempt.readiness_gate, "ready");

  const passAttempt = transferVerification.evaluateTransferAttempt({
    attemptText: passText,
    attemptIndex: 1,
    probe,
    transferHistory: [],
    startedAt: 11_000,
    now: () => 11_250,
  });
  const failAttempt = transferVerification.evaluateTransferAttempt({
    attemptText: failText,
    attemptIndex: 2,
    probe,
    transferHistory: [passAttempt],
    startedAt: 11_500,
    now: () => 11_900,
  });
  const skipAttempt = transferVerification.makeTransferSkip({
    attemptText: "",
    attemptIndex: 3,
    probe,
    transferHistory: [passAttempt, failAttempt],
    startedAt: 12_000,
    now: () => 12_350,
  });

  assert.equal(passAttempt.outcome, "transfer_pass");
  assert.equal(passAttempt.questionId, "transfer_to_related_file");
  assert.equal(failAttempt.outcome, "transfer_fail");
  assert.equal(failAttempt.questionId, "transfer_to_related_file");
  assert.equal(skipAttempt.outcome, "transfer_skip");
  assert.equal(skipAttempt.questionId, "transfer_unknown");
  assert.match(passAttempt.attemptTextPreview, /consumer/);
  assert.match(failAttempt.attemptTextPreview, /not sure why/);
  assert.equal(skipAttempt.attemptTextPreview, "skipped");

  assert.equal(failAttempt.escalationCandidate, false, "single failure should not escalate automatically");
  assert.ok(failAttempt.followUpTasks.includes("Name one concrete invariant that must hold in the related boundary file."));

  const repeatedFail = transferVerification.evaluateTransferAttempt({
    attemptText: "Another weak and unclear answer.",
    attemptIndex: 4,
    probe,
    transferHistory: [passAttempt, failAttempt],
    startedAt: 12_600,
    now: () => 12_900,
  });
  assert.equal(repeatedFail.outcome, "transfer_fail");
  assert.equal(repeatedFail.escalationCandidate, true);
  assert.equal(repeatedFail.recurrenceTags.includes("transfer-recurrence-2"), true);
});

test("workspace escalation raises transfer-failure-after-repair on repeated transfer failures", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const escalation = await loadWorkspaceEscalationModule();
  const reviewSession = await loadReviewSessionModule();
  const transferVerification = await loadTransferVerificationModule();

  const boundary = { ...fixtures.ownershipBoundary, evidence: fixtures.fixtureEvidence };
  const readyAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch now returns null, and `if (!session)` checks must keep the contract before privileged operations.",
    boundary,
    selfConfidence: 62,
    attemptIndex: 1,
    startedAt: 30_000,
    submittedAt: 30_800,
  });
  const probe = transferVerification.makeTransferProbe(boundary, fixtures.ownershipReviewQueue);

  const failOne = transferVerification.evaluateTransferAttempt({
    attemptText: "I am not sure why this is the same behavior.",
    attemptIndex: 1,
    probe,
    transferHistory: [],
    startedAt: 31_000,
    now: () => 31_420,
  });
  const failTwo = transferVerification.evaluateTransferAttempt({
    attemptText: "I cannot re-prove the related invariant.",
    attemptIndex: 2,
    probe,
    transferHistory: [failOne],
    startedAt: 31_500,
    now: () => 31_900,
  });
  const decision = escalation.evaluateWorkspaceEscalation({
    boundary,
    sessionState: reviewSession.createOwnershipSessionState(),
    readinessHistory: [readyAttempt],
    transferHistory: [failOne, failTwo],
    reviewQueue: fixtures.ownershipReviewQueue,
    evidenceRefs: fixtures.fixtureEvidence,
  });

  assert.equal(decision.isCandidate, true);
  assert.equal(
    decision.triggers.some((trigger) => trigger.reason === "transfer-failure-after-repair"),
    true,
    "repeated transfer failure should emit transfer failure escalation",
  );
});

test("transfer readiness integration updates continuity and debt by transfer outcome", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const transferVerification = await loadTransferVerificationModule();

  const boundary = {
    ...fixtures.ownershipBoundary,
    evidence: fixtures.fixtureEvidence,
  };
  const readyAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch can return null; callers must guard with `if (!session)` before any privileged request.",
    boundary,
    selfConfidence: 62,
    attemptIndex: 1,
    startedAt: 22_000,
    submittedAt: 22_450,
  });
  const probe = transferVerification.makeTransferProbe(boundary, fixtures.ownershipReviewQueue);
  const baseline = transferVerification.integrateTransferReadinessState({
    boundary,
    reviewQueue: fixtures.ownershipReviewQueue,
    readiness: readyAttempt,
    transferHistory: [],
  });

  assert.equal(baseline.transfer.required, true);
  assert.equal(baseline.transfer.transferAttemptCount, 0);
  assert.equal(baseline.transfer.transferOutcome, null);
  assert.equal(baseline.transfer.transferRecurrenceTags.length, 0);
  assert.equal(Math.round(baseline.transfer.readinessContinuity * 100), 52);
  assert.equal(Math.round(baseline.transfer.debtSignal * 100), 48);
  assert.equal(baseline.transfer.transferred, false);

  const passingAttempt = transferVerification.evaluateTransferAttempt({
    attemptText: "In consumer, transfer the same `if (!session)` guard from session.ts to keep the contract identical.",
    attemptIndex: 1,
    probe,
    transferHistory: [],
    startedAt: 22_600,
    now: () => 22_880,
  });
  const passed = transferVerification.integrateTransferReadinessState({
    boundary,
    reviewQueue: fixtures.ownershipReviewQueue,
    readiness: readyAttempt,
    transferHistory: [passingAttempt],
  });

  assert.equal(passed.transfer.transferOutcome, "transfer_pass");
  assert.equal(passed.transfer.transferred, true);
  assert.equal(Math.round(passed.transfer.readinessContinuity * 100), 87);
  assert.equal(Math.round(passed.transfer.debtSignal * 100), 13);

  const firstFail = transferVerification.evaluateTransferAttempt({
    attemptText: "I do not have enough context for the caller.",
    attemptIndex: 1,
    probe,
    transferHistory: [],
    startedAt: 23_000,
    now: () => 23_200,
  });
  const secondFail = transferVerification.evaluateTransferAttempt({
    attemptText: "Still not transferable.",
    attemptIndex: 2,
    probe,
    transferHistory: [firstFail],
    startedAt: 23_300,
    now: () => 23_600,
  });
  const failed = transferVerification.integrateTransferReadinessState({
    boundary,
    reviewQueue: fixtures.ownershipReviewQueue,
    readiness: readyAttempt,
    transferHistory: [firstFail, secondFail],
  });

  assert.equal(failed.transfer.transferOutcome, "transfer_fail");
  assert.equal(failed.transfer.transferEscalationCandidate, true);
  assert.equal(failed.transfer.transferRecurrenceTags.includes("transfer-recurrence-2"), true);
  assert.equal(Math.round(failed.transfer.readinessContinuity * 100), 47);
  assert.equal(Math.round(failed.transfer.debtSignal * 100), 53);
});

test("ownership memory appends attempt outcomes instead of replacing previous attempts", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const memory = await loadOwnershipMemoryModule();
  const boundary = { ...fixtures.ownershipBoundary, evidence: fixtures.fixtureEvidence };
  const initialMemory = memory.createOwnershipMemoryState();
  const firstAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText: "I do not yet know how null relates to the caller.",
    boundary,
    selfConfidence: 70,
    attemptIndex: 1,
    startedAt: 10_000,
    submittedAt: 10_200,
  });
  const secondAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before privileged work.",
    boundary,
    selfConfidence: 60,
    attemptIndex: 2,
    startedAt: 11_000,
    submittedAt: 11_250,
  });

  const afterFirst = memory.appendReadinessAttempt({
    memory: initialMemory,
    boundary,
    readiness: firstAttempt,
  });
  const afterSecond = memory.appendReadinessAttempt({
    memory: afterFirst,
    boundary,
    readiness: secondAttempt,
  });
  const projection = memory.buildOwnershipMemoryProjection(afterSecond);

  assert.equal(initialMemory.events.length, 0, "append should not mutate the previous memory state");
  assert.equal(afterFirst.events.length, 1);
  assert.equal(afterSecond.events.length, 2);
  assert.deepEqual(
    projection.boundary_history.map((entry) => entry.source_event_id),
    afterSecond.events.map((event) => event.event_id),
  );
});

test("ownership memory projects readiness state from effective transfer-gated boundary state", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const memory = await loadOwnershipMemoryModule();
  const boundary = { ...fixtures.ownershipBoundary, evidence: fixtures.fixtureEvidence };
  const readyAttempt = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before privileged work and unauthenticated flow stops.",
    boundary,
    selfConfidence: 60,
    attemptIndex: 1,
    startedAt: 12_000,
    submittedAt: 12_300,
  });

  assert.equal(readyAttempt.readiness_gate, "ready");
  assert.equal(readyAttempt.state, "owned");

  const nextMemory = memory.appendReadinessAttempt({
    memory: memory.createOwnershipMemoryState(),
    boundary,
    readiness: readyAttempt,
    effectiveBoundaryState: "partial",
  });
  const projection = memory.buildOwnershipMemoryProjection(nextMemory, {
    boundaryId: boundary.id,
  });

  assert.equal(projection.boundary_history.length, 1);
  assert.equal(
    projection.boundary_history[0]?.state,
    "partial",
    "readiness memory should project the transfer-gated boundary state, not raw evaluator ownership",
  );
});

test("ownership memory tracks recurring gaps and derives revisit labels", async () => {
  const fixtures = await loadFixturesModule();
  const memory = await loadOwnershipMemoryModule();
  const boundary = fixtures.ownershipBoundary;
  const firstObservation = {
    id: "observation-101",
    filePath: boundary.filePath,
    reason: "could not connect caller/test" as const,
    note: "Caller/test relation was not connected.",
  };
  const secondObservation = {
    id: "observation-102",
    filePath: boundary.filePath,
    reason: "could not connect caller/test" as const,
    note: "Caller/test relation was still missing on revisit.",
  };

  const withFirst = memory.appendGuidedObservation({
    memory: memory.createOwnershipMemoryState(),
    boundary,
    observation: firstObservation,
    occurredAt: 1_700_000_000_000,
  });
  const withSecond = memory.appendGuidedObservation({
    memory: withFirst,
    boundary,
    observation: secondObservation,
    occurredAt: 1_700_000_060_000,
  });
  const projection = memory.buildOwnershipMemoryProjection(withSecond);

  assert.equal(projection.recurring_gaps.length, 1);
  assert.equal(projection.recurring_gaps[0]?.gap_key, "relation-gap:caller-test");
  assert.equal(projection.recurring_gaps[0]?.count, 2);
  assert.equal(projection.revisit_labels.includes("revisit-relation-gap"), true);
  assert.deepEqual(projection.recurring_gaps[0]?.source_event_ids, [
    withFirst.events[0]?.event_id,
    withSecond.events[1]?.event_id,
  ]);
});

test("ownership memory projection and export filter events by boundary id", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const memory = await loadOwnershipMemoryModule();
  const boundaryA = { ...fixtures.ownershipBoundary, evidence: fixtures.fixtureEvidence };
  const boundaryB = {
    ...fixtures.ownershipBoundary,
    id: "boundary-02",
    filePath: "src/runtime/consumer.ts",
    title: "Caller boundary",
  };
  const readyAttemptA = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before privileged work.",
    boundary: boundaryA,
    selfConfidence: 60,
    attemptIndex: 1,
    startedAt: 13_000,
    submittedAt: 13_400,
  });
  const observationOneB = {
    id: "observation-b-01",
    filePath: boundaryB.filePath,
    reason: "could not connect caller/test" as const,
    note: "Boundary B relation gap should not leak into boundary A.",
  };
  const observationTwoB = {
    id: "observation-b-02",
    filePath: boundaryB.filePath,
    reason: "could not connect caller/test" as const,
    note: "Boundary B relation gap repeated.",
  };

  const withA = memory.appendReadinessAttempt({
    memory: memory.createOwnershipMemoryState(),
    boundary: boundaryA,
    readiness: readyAttemptA,
    effectiveBoundaryState: "partial",
  });
  const withBOne = memory.appendGuidedObservation({
    memory: withA,
    boundary: boundaryB,
    observation: observationOneB,
    occurredAt: 14_000,
  });
  const globalMemory = memory.appendGuidedObservation({
    memory: withBOne,
    boundary: boundaryB,
    observation: observationTwoB,
    occurredAt: 14_500,
  });
  const projectionA = memory.buildOwnershipMemoryProjection(globalMemory, {
    boundaryId: boundaryA.id,
  });
  const exportA = memory.buildOwnershipMemoryExportBundle({
    memory: globalMemory,
    mode: "manual",
    boundaryId: boundaryA.id,
    exportedAt: 1_700_000_000_000,
  });

  assert.equal(projectionA.event_count, 1);
  assert.equal(projectionA.boundary_history.every((entry) => entry.boundary_id === boundaryA.id), true);
  assert.deepEqual(projectionA.recurring_gaps, []);
  assert.equal(projectionA.revisit_labels.includes("revisit-relation-gap"), false);
  assert.equal(exportA.events.length, 1);
  assert.equal(exportA.events.every((event) => event.boundary_id === boundaryA.id), true);
  assert.equal(exportA.boundary_history.every((entry) => entry.boundary_id === boundaryA.id), true);
});

test("ownership memory export includes evidence refs on every boundary state record", async () => {
  const fixtures = await loadFixturesModule();
  const attemptReadiness = await loadAttemptReadinessModule();
  const memory = await loadOwnershipMemoryModule();
  const boundary = { ...fixtures.ownershipBoundary, evidence: fixtures.fixtureEvidence };
  const readiness = attemptReadiness.evaluateOwnershipAttemptReadiness({
    attemptText:
      "The createSession branch returns null from 204; callers must guard with `if (!session)` before privileged work.",
    boundary,
    selfConfidence: 60,
    attemptIndex: 1,
    startedAt: 20_000,
    submittedAt: 20_400,
  });
  const exported = memory.buildOwnershipMemoryExportBundle({
    memory: memory.appendReadinessAttempt({
      memory: memory.createOwnershipMemoryState(),
      boundary,
      readiness,
    }),
    mode: "manual",
    exportedAt: 1_700_000_000_000,
  });

  assert.equal(exported.event_count, 1);
  assert.equal(exported.boundary_history.length, 1);
  assert.equal(
    exported.boundary_history.every((entry) => entry.evidence_refs.length > 0),
    true,
    "each boundary state history record must carry evidence refs",
  );
});

test("ownership memory daily compaction is deterministic and preserves evidence refs", async () => {
  const fixtures = await loadFixturesModule();
  const memory = await loadOwnershipMemoryModule();
  const boundary = fixtures.ownershipBoundary;
  const one = {
    id: "observation-201",
    filePath: boundary.filePath,
    reason: "inconclusive" as const,
    note: "First incomplete boundary proof.",
  };
  const two = {
    id: "observation-202",
    filePath: boundary.filePath,
    reason: "inconclusive" as const,
    note: "Second incomplete boundary proof.",
  };
  const withOne = memory.appendGuidedObservation({
    memory: memory.createOwnershipMemoryState(),
    boundary,
    observation: one,
    occurredAt: Date.UTC(2026, 4, 20, 22),
  });
  const withTwo = memory.appendGuidedObservation({
    memory: withOne,
    boundary,
    observation: two,
    occurredAt: Date.UTC(2026, 4, 21, 1),
  });
  const exported = memory.buildOwnershipMemoryExportBundle({
    memory: withTwo,
    mode: "daily",
    exportedAt: Date.UTC(2026, 4, 21, 12),
  });

  assert.equal(exported.compaction.compacted_event_count, 1);
  assert.equal(exported.compaction.retained_event_count, 1);
  assert.equal(exported.compaction.daily_cutoff_at, "2026-05-21T00:00:00.000Z");
  assert.equal(exported.boundary_history.length, 2);
  assert.equal(exported.boundary_history.every((entry) => entry.evidence_refs.length > 0), true);
});

test("workspace escalation detects relation-gap recurrence and repeated low calibration", async () => {
  const fixtures = await loadFixturesModule();
  const escalation = await loadWorkspaceEscalationModule();

  const boundary = { ...fixtures.ownershipBoundary, evidence: fixtures.fixtureEvidence };
  const firstReadiness = {
    attempt_id: "attempt-boundary-01-01-lowcal",
    self_confidence: 22,
    evidence_fit: 0.2,
    calibration_score: 0.12,
    readiness_gate: "repair-needed" as const,
    state: "partial",
    summary: "Missing required calibration signal and evidence binding.",
    gapDiagnoses: [],
    smallestRepair: "Add explicit invariant evidence for transfer and caller behavior.",
    returnCondition: "Retry with bounded invariant statements.",
    attemptEvidenceRefs: fixtures.fixtureEvidence.slice(0, 2),
    startedAt: 1_000,
    submittedAt: 1_200,
    elapsedMs: 200,
  };
  const secondReadiness = {
    attempt_id: "attempt-boundary-01-02-lowcal",
    self_confidence: 24,
    evidence_fit: 0.19,
    calibration_score: 0.2,
    readiness_gate: "repair-needed" as const,
    state: "partial",
    summary: "Missing required calibration signal and evidence binding.",
    gapDiagnoses: [],
    smallestRepair: "Add explicit invariant evidence for transfer and caller behavior.",
    returnCondition: "Retry with bounded invariant statements.",
    attemptEvidenceRefs: fixtures.fixtureEvidence.slice(0, 2),
    startedAt: 1_300,
    submittedAt: 1_500,
    elapsedMs: 210,
  };
  const recurring = escalation.evaluateWorkspaceEscalation({
    boundary,
    sessionState: {
      currentIndex: 3,
      isComplete: true,
      weakAttemptStreak: 0,
      observations: [
        {
          id: "obs-01",
          filePath: boundary.filePath,
          reason: "could not connect caller/test",
          note: "caller/test relation still missing after initial attempt.",
        },
        {
          id: "obs-02",
          filePath: boundary.filePath,
          reason: "could not connect caller/test",
          note: "caller/test relation still missing after recovery.",
        },
      ],
      lastFeedback: null,
      showHintLadder: false,
    },
    readinessHistory: [firstReadiness, secondReadiness],
    transferHistory: [],
    reviewQueue: fixtures.ownershipReviewQueue,
    evidenceRefs: fixtures.fixtureEvidence,
  });

  assert.equal(recurring.isCandidate, true);
  assert.equal(
    recurring.triggers.some((trigger) => trigger.reason === "relation-gap-recurrence"),
    true,
  );
  assert.equal(
    recurring.triggers.some((trigger) => trigger.reason === "repeated-low-calibration"),
    true,
  );
});

test("workspace escalation detects dependency churn from repeated non-progress attempts", async () => {
  const fixtures = await loadFixturesModule();
  const escalation = await loadWorkspaceEscalationModule();

  const boundary = fixtures.ownershipBoundary;
  const stagnantAttempts = [
    {
      attempt_id: "attempt-boundary-01-01-stagnant",
      self_confidence: 20,
      evidence_fit: 0.22,
      calibration_score: 0.22,
      readiness_gate: "repair-needed" as const,
      state: "partial",
      summary: "Same non-ready attempt without evidence expansion.",
      gapDiagnoses: [],
      gapReason: "No change.",
      smallestRepair: "Make the same boundary proof more specific.",
      returnCondition: "Retry with equivalent evidence.",
      attemptEvidenceRefs: fixtures.fixtureEvidence,
      startedAt: 4_000,
      submittedAt: 4_100,
      elapsedMs: 100,
    },
    {
      attempt_id: "attempt-boundary-01-02-stagnant",
      self_confidence: 20,
      evidence_fit: 0.22,
      calibration_score: 0.22,
      readiness_gate: "repair-needed" as const,
      state: "partial",
      summary: "Same non-ready attempt without evidence expansion.",
      gapDiagnoses: [],
      gapReason: "No change.",
      smallestRepair: "Make the same boundary proof more specific.",
      returnCondition: "Retry with equivalent evidence.",
      attemptEvidenceRefs: fixtures.fixtureEvidence,
      startedAt: 4_200,
      submittedAt: 4_300,
      elapsedMs: 100,
    },
  ];
  const decision = escalation.evaluateWorkspaceEscalation({
    boundary,
    sessionState: {
      currentIndex: 3,
      isComplete: true,
      weakAttemptStreak: 0,
      observations: [],
      lastFeedback: null,
      showHintLadder: false,
    },
    readinessHistory: stagnantAttempts,
    transferHistory: [],
    reviewQueue: fixtures.ownershipReviewQueue,
    evidenceRefs: fixtures.fixtureEvidence,
  });

  assert.equal(
    decision.triggers.some((trigger) => trigger.reason === "dependency-churn"),
    true,
    "repeated non-progress attempts should trigger dependency churn",
  );
});

test("workspace escalation artifact includes minimal handoff context and blocking IDs", async () => {
  const fixtures = await loadFixturesModule();
  const escalation = await loadWorkspaceEscalationModule();

  const boundary = fixtures.ownershipBoundary;
  const readinessHistory = [
    {
      attempt_id: "attempt-boundary-01-01-001",
      self_confidence: 12,
      evidence_fit: 0.16,
      calibration_score: 0.1,
      readiness_gate: "repair-needed" as const,
      state: "partial",
      summary: "No concrete proof path was established.",
      gapReason: "insufficient proof",
      gapDiagnoses: [],
      smallestRepair: "Provide proof of caller contract mapping.",
      returnCondition: "Retry after one concrete invariant proof.",
      attemptEvidenceRefs: fixtures.fixtureEvidence.slice(0, 2),
      startedAt: 100,
      submittedAt: 110,
      elapsedMs: 10,
    },
    {
      attempt_id: "attempt-boundary-01-02-002",
      self_confidence: 12,
      evidence_fit: 0.16,
      calibration_score: 0.1,
      readiness_gate: "repair-needed" as const,
      state: "partial",
      summary: "No concrete proof path was established.",
      gapReason: "insufficient proof",
      gapDiagnoses: [],
      smallestRepair: "Provide proof of caller contract mapping.",
      returnCondition: "Retry after one concrete invariant proof.",
      attemptEvidenceRefs: fixtures.fixtureEvidence.slice(0, 2),
      startedAt: 120,
      submittedAt: 130,
      elapsedMs: 10,
    },
  ];
  const decision = escalation.evaluateWorkspaceEscalation({
    boundary,
    sessionState: {
      currentIndex: 3,
      isComplete: true,
      weakAttemptStreak: 0,
      observations: [],
      lastFeedback: null,
      showHintLadder: false,
    },
    readinessHistory,
    transferHistory: [],
    reviewQueue: fixtures.ownershipReviewQueue,
    evidenceRefs: fixtures.fixtureEvidence,
  });
  const artifact = escalation.buildOwnershipReviewArtifact({
    boundary,
    sessionState: {
      currentIndex: 3,
      isComplete: true,
      weakAttemptStreak: 0,
      observations: [],
      lastFeedback: null,
      showHintLadder: false,
    },
    readinessHistory,
    transferHistory: [],
    reviewQueue: fixtures.ownershipReviewQueue,
    evidenceRefs: fixtures.fixtureEvidence,
    sourceKind: "diff",
    decision,
    goalContext: boundary.title,
    now: () => 1_700_000_000_000,
    diffTextRef: readinessHistory[1].attempt_id,
  });

  assert.equal(typeof artifact.artifact_id, "string");
  assert.equal(artifact.source_kind, "diff");
  assert.equal(artifact.reason, decision.primaryReason ?? "manual");
  assert.equal(artifact.evidence_refs.length > 0, true);
  assert.equal(artifact.blocking_ids.length >= 1, true);
  assert.equal(artifact.read_path.includes(boundary.filePath), true);
  assert.equal(artifact.areas_touched.length > 0, true);
  assert.equal(artifact.required_evidence.length > 0, true);
  assert.equal(artifact.blocked_reasons.length >= 1, true);
  assert.equal(artifact.created_at, new Date(1_700_000_000_000).toISOString());
});

test("App gates state transitions when readiness is ready but transfer has not passed", async () => {
  const appSource = readFileSync(new URL("../src/App.tsx", import.meta.url), "utf8");

  assert.match(
    appSource,
    /const isTransferSatisfied =\s*!isTransferRequired \|\| projectedAttempt\.transfer\.transferOutcome === "transfer_pass";/,
    "App should gate ownership stability on transfer pass when transfer is required",
  );
  assert.match(
    appSource,
    /nextBoundaryState =\s*projectedAttempt\.readiness_gate === "ready" && isTransferSatisfied\s*\?\s*"owned"\s*:\s*projectedAttempt\.readiness_gate === "ready"\s*\?\s*"partial"/,
    "App should downgrade ready state to partial until transfer passes",
  );
  assert.match(
    appSource,
    /onSubmitTransferAttempt=\{submitTransferAttempt\}/,
    "App should pass transfer submit handler into the harness panel",
  );
  assert.match(
    appSource,
    /onSkipTransfer=\{submitTransferSkip\}/,
    "App should pass transfer skip handler into the harness panel",
  );
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

test("buildBoundaryCandidates emits Slice 4 boundary contract fields with evidence and questions", async () => {
  const fixtures = await loadFixturesModule();
  const builder = await loadBoundaryBuilderModule();

  const candidates = builder.buildBoundaryCandidates({
    baseBoundary: fixtures.ownershipBoundary,
    fileFixtures: fixtures.fileFixtures,
    evidenceRefs: fixtures.fixtureEvidence,
    reviewQueue: fixtures.ownershipReviewQueue,
    fileDiffsByPath: fixtures.fileDiffsByPath,
  });

  assert.equal(candidates.length, 1, "fixture should produce one deterministic boundary candidate");
  const candidate = candidates[0];
  assert.ok(candidate, "candidate should exist");
  assert.equal(candidate.files.includes("src/api/session.ts"), true, "boundary files must include primary boundary file");
  assert.equal(candidate.files.includes("src/api/session.test.ts"), true, "boundary files must include related test");
  assert.equal(candidate.files.includes("src/runtime/consumer.ts"), true, "boundary files must include related caller");
  assert.equal(typeof candidate.responsibility_claim, "string", "responsibility claim must be explicit");
  assert.ok(candidate.responsibility_claim.length > 8, "responsibility claim should not be empty");
  assert.equal(candidate.evidence.length > 0, true, "boundary evidence should be evidence-backed");
  assert.equal(candidate.open_questions.length > 0, true, "boundary should expose open questions");
  assert.equal(candidate.risk.score >= 0 && candidate.risk.score <= 100, true, "risk score should be normalized");
  assert.equal(
    candidate.risk.relationWeight > 0,
    true,
    "risk should include deterministic relation-weight contribution",
  );
  assert.ok(["observed", "inferred", "unverified", "conflict"].includes(candidate.confidence), "confidence should be valid enum");
  assert.equal(
    candidate.files.every((path) => ["src/api/session.ts", "src/api/session.test.ts", "src/runtime/consumer.ts"].includes(path)),
    true,
    "fixture scope should remain selected relation files, not arbitrary repo paths",
  );
  assert.equal(
    candidate.open_questions.length > 0,
    true,
    "open question list should remain non-empty",
  );
  assert.equal(
    candidate.responsibility_claim.toLowerCase().includes("whole repo"),
    false,
    "responsibility claim should remain scoped to fixture relation files",
  );
  assert.equal(
    (candidate.state_reason_hints?.[fixtures.ownershipBoundary.filePath] ?? "").startsWith("questionable:"),
    true,
    "whole-scope selection should be marked as questionable",
  );
});

test("selectHighestRiskBoundary picks the boundary with the highest risk score deterministically", async () => {
  const builder = await loadBoundaryBuilderModule();
  const candidates: OwnershipBoundary[] = [
    {
      id: "low",
      files: ["src/api/session.ts"],
      responsibility_claim: "Low risk boundary",
      evidence: [],
      open_questions: ["question a"],
      risk: {
        score: 12,
        relationWeight: 3,
        missingCallerPenalty: 0,
        missingDeletionPenalty: 0,
        blockedPenalty: 0,
        questionablePenalty: 0,
      },
      confidence: "observed",
      filePath: "src/api/session.ts",
      startLine: 1,
      endLine: 4,
      state_reason_hints: {},
      title: "low",
      whyMatters: "test",
      prompt: ["p"],
      returnCondition: "ok",
    },
    {
      id: "high",
      files: ["src/api/session.ts"],
      responsibility_claim: "High risk boundary",
      evidence: [],
      open_questions: ["question b"],
      risk: {
        score: 88,
        relationWeight: 9,
        missingCallerPenalty: 0,
        missingDeletionPenalty: 0,
        blockedPenalty: 0,
        questionablePenalty: 0,
      },
      confidence: "observed",
      filePath: "src/api/session.ts",
      startLine: 1,
      endLine: 4,
      state_reason_hints: {},
      title: "high",
      whyMatters: "test",
      prompt: ["p"],
      returnCondition: "ok",
    },
  ];

  const selected = builder.selectHighestRiskBoundary(candidates);
  assert.equal(selected.id, "high");
});

test("projectBoundaryFileStates emits explicit non-owned reason labels", async () => {
  const fixtures = await loadFixturesModule();
  const builder = await loadBoundaryBuilderModule();

  const baseCandidate = builder.selectHighestRiskBoundary(
    builder.buildBoundaryCandidates({
      baseBoundary: fixtures.ownershipBoundary,
      fileFixtures: fixtures.fileFixtures,
      evidenceRefs: fixtures.fixtureEvidence,
      reviewQueue: fixtures.ownershipReviewQueue,
      fileDiffsByPath: fixtures.fileDiffsByPath,
    }),
  );
  const candidate = {
    ...baseCandidate,
    state_reason_hints: {
      ...baseCandidate.state_reason_hints,
      [baseCandidate.filePath]: "questionable: fixture-local warning should not override missing-caller projection",
      "src/api/session.test.ts": "gap: missing deletion path - legacy fixture warning",
      "src/runtime/consumer.ts": "questionable: caller prerequisite is inferred from queue gaps",
    },
  };

  const synthetic = {
    ...fixtures.initialFileStates,
    "src/api/session.test.ts": "attempted" as const,
    "src/runtime/consumer.ts": "attempted" as const,
  };
  const projectionDiffs = { ...fixtures.fileDiffsByPath };
  delete projectionDiffs["src/api/session.test.ts"];

  const projected = builder.projectBoundaryFileStates({
    boundary: candidate,
    baseFileStates: synthetic,
    fileDiffsByPath: {
      ...projectionDiffs,
      "src/runtime/consumer.ts": {},
    },
    reviewQueue: fixtures.ownershipReviewQueue,
  });

  assert.equal(Object.entries(projected.fileStates).length >= 0, true);
  const expectedPaths = [candidate.filePath, "src/api/session.test.ts", "src/runtime/consumer.ts"];

  for (const filePath of expectedPaths) {
    const reason = projected.fileStateReasons[filePath];
    const state = projected.fileStates[filePath];
    if (state !== "owned") {
      assert.ok(reason.length > 0, `reason should be present for non-owned state ${filePath}`);
      assert.match(
        reason,
        /^(gap: missing caller|gap: missing deletion path|blocked: prerequisite|questionable)/,
        "reason should use one of the reasoned projection labels",
      );
    }
  }

  assert.match(
    projected.fileStateReasons["src/api/session.ts"] ?? "",
    /^gap: missing caller - fixture-local warning should not override missing-caller projection$/,
    "structured missing-caller reason should preserve prefix and append hint.",
  );
  assert.match(
    projected.fileStateReasons["src/api/session.test.ts"] ?? "",
    /^gap: missing deletion path - legacy fixture warning$/,
    "structured missing-deletion reason should preserve prefix and append hint.",
  );
  assert.match(
    projected.fileStateReasons["src/runtime/consumer.ts"] ?? "",
    /^blocked: prerequisite - caller prerequisite is inferred from queue gaps$/,
    "structured blocked reason should preserve prefix and append hint.",
  );
});

test("file-tree snippet preserves required reason prefixes", async () => {
  const formatter = await loadFileTreeReasonFormattingModule();

  assert.equal(
    formatter.makeReasonSnippet("gap: missing deletion path - legacy fixture warning and extra context for a larger-than-preview reason"),
    "gap: missing deletion path",
  );
  assert.equal(
    formatter.makeReasonSnippet(
      "gap: missing caller - fixture-local hint about missing upstream references for the active boundary",
    ),
    "gap: missing caller",
  );
  assert.equal(
    formatter.makeReasonSnippet(
      "blocked: prerequisite - caller prerequisite is inferred from queue gaps and should stay compact in this panel",
    ),
    "blocked: prerequisite",
  );
  assert.equal(
    formatter.makeReasonSnippet(
      "questionable: no evidence-backed reasoned claim for this file in this boundary and this keeps a long suffix.",
    ),
    "questionable",
  );
  assert.equal(
    formatter.makeReasonSnippet("This reason is long enough to need truncation in the compact view."),
    "This reason is long eno...",
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
    /buildBoundaryCandidates\([\s\S]*ownershipBoundary/,
    "App should build boundary candidates from fixture contract inputs",
  );
  assert.match(
    appSource,
    /selectHighestRiskBoundary\(boundaryCandidates\)/,
    "App should select the deterministic highest-risk boundary for the flow",
  );
  assert.match(
    appSource,
    /projectBoundaryFileStates\(/,
    "App should project boundary file states before rendering the file tree",
  );
  assert.match(
    appSource,
    /fileStateReasons=\{fileStateReasons\}/,
    "App should provide reasoned non-owned file states to file-tree rendering",
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
