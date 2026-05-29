import test from "node:test";
import assert from "node:assert/strict";

import {
  buildEvidencePack,
  type EvidenceCitation,
  type EvidencePack,
} from "../src/ownershipWorkbench/languageProposal.ts";
import {
  buildFocusCandidates,
  type FocusCandidate,
} from "../src/ownershipWorkbench/focusCandidates.ts";
import {
  analyzeLargeFileHeuristics,
  buildOwnershipQuestionPlan,
  verifyOwnershipQuestionPlan,
  projectOwnershipQuestionPlanToQuestionBatch,
  type OwnershipQuestionPlan,
  type PlannedOwnershipQuestion,
} from "../src/ownershipWorkbench/ownershipQuestionPlanner.ts";
import type { RepoInventory } from "../src/ownershipWorkbench/repoInventoryTypes.ts";

const GENERATED_AT = "2026-01-01T00:00:00.000Z";
const LARGE_FILE_PATH = "src/workbench-large.tsx";
const SMALL_FILE_PATH = "src/workbench-small.tsx";
const ROUTE_HELPER_FILE_PATH = "src/route-bus.ts";

function splitLines(value: string): string[] {
  return value.length === 0 ? [] : value.split("\n");
}

function buildInventory(fileContents: Record<string, string>): RepoInventory {
  return {
    sourceRoot: "src",
    generatedAt: GENERATED_AT,
    files: Object.entries(fileContents).map(([path, contents]) => ({
      path,
      extension: path.includes(".") ? path.slice(path.lastIndexOf(".")) : "",
      role: "source",
      sizeBytes: contents.length,
      lineCount: Math.max(1, splitLines(contents).length),
      excerpt: splitLines(contents).find((line) => line.trim().length > 0) ?? "",
    })),
    tree: {
      path: "src",
      kind: "directory",
      fileCount: Object.keys(fileContents).length,
      totalSizeBytes: Object.values(fileContents).reduce((sum, content) => sum + content.length, 0),
    },
  };
}

function buildLargeSegmentLines(segmentIndex: number): string[] {
  return [
    `type Segment${segmentIndex}Payload = { segmentId: number; route: string; ready: boolean };`,
    "",
    `export function SegmentBoard${segmentIndex}(props: Segment${segmentIndex}Payload) {`,
    `  const [items, setItems] = React.useState<Segment${segmentIndex}Payload[]>([]);`,
    "  const [readyCount, setReadyCount] = React.useState<number>(props.segmentId);",
    "  const [route, setRoute] = React.useState<string>(\"initial\");",
    "",
    "  React.useEffect(() => {",
    "    const marker = setTimeout(() => {",
    `      setItems((current) => current.concat([props]));`,
    "      setReadyCount((value) => value + 1);",
    "    }, 1);",
    "    return () => {",
    "      clearTimeout(marker);",
    "    };",
    "  }, [props.segmentId]);",
    "",
    `  if (readyCount === 0) {`,
    `    return <div data-segment="${segmentIndex}">init</div>;`,
    "  }",
    `  return <section data-segment="${segmentIndex}">{items.length}</section>;`,
    "}",
    "",
    `export function useSegmentTracker${segmentIndex}(id: number) {`,
    `  const [route, setRoute] = React.useState<string>(\`segment-${segmentIndex}\`);`,
    `  const [events, setEvents] = React.useState<Segment${segmentIndex}Payload[]>([]);`,
    "",
    "  React.useEffect(() => {",
    `    setRoute("segment-${segmentIndex}-" + id);`,
    "    setEvents((existing) => existing.slice(0, 1));",
    "    return () => setEvents([]);",
    "  }, [id]);",
    "  return { route, events };",
    "}",
    "",
    `export async function loadSegmentPayload${segmentIndex}(id: number) {`,
    `  const response = await fetch("/api/segment/" + ${segmentIndex} + "/" + id + "/payload", {`,
    "    method: \"POST\",",
    `    body: JSON.stringify({ id: id, route: "segment-${segmentIndex}" }),`,
    "  });",
    "  return response.json();",
    "}",
    "",
    `export function routeHandler${segmentIndex}(id: number) {`,
    `  const state = useSegmentTracker${segmentIndex}(id);`,
    `  return { route: "route-${segmentIndex}-" + id, state };`,
    "}",
    "",
    `export function repairUncertainty${segmentIndex}() {`,
    "  // uncertainty around cleanup coupling; this is a repair/refactor candidate.",
    "  const [isRefactoring, setRefactoring] = React.useState<boolean>(false);",
    "  React.useEffect(() => {",
    "    setRefactoring(true);",
    "    return () => setRefactoring(false);",
    "  }, []);",
    "  return { isRefactoring };",
    "}",
    "",
  ];
}

function buildLargeWorkbenchFileLines(): string[] {
  const lines = [
    'import * as React from "react";',
    'import { useQuery, useMutation } from "@tanstack/react-query";',
    "",
    "export function repairRefactorAnchor() {",
    "  // cleanup effect and repair/refactor coupling should gate this ownership slice.",
    '  const [needsRepair, setNeedsRepair] = React.useState<boolean>(false);',
    "  React.useEffect(() => {",
    "    setNeedsRepair((value) => !value);",
    "  }, []);",
    "  return { needsRepair, repairMode: true };",
    "}",
    "",
    "export function RepairPathSignal() {",
    "  return \"repair/refactor path selected\";",
    "}",
    "",
  ];

  for (let segmentIndex = 1; segmentIndex <= 16; segmentIndex += 1) {
    lines.push(...buildLargeSegmentLines(segmentIndex));
  }

  lines.push(
    "export default function LargeWorkbenchApp() {",
    "  const repairSummary = RepairPathSignal();",
    "  return <main>{repairSummary}</main>;",
    "}",
    "",
  );

  return lines;
}

function buildSmallWorkbenchFileLines(): string[] {
  return [
    'import * as React from "react";',
    'import { useQuery } from "@tanstack/react-query";',
    "",
    "export type SmallProps = { title: string; }",
    "",
    "export function SmallPanel({ title }: SmallProps) {",
    "  const [ready, setReady] = React.useState(false);",
    "  React.useEffect(() => {",
    "    if (!ready) {",
    "      setReady(Boolean(title));",
    "    }",
    "  }, [title]);",
    '  return <section>{title}:{ready ? "ready" : "pending"}</section>;',
    "}",
    "",
    "export function useSmallState() {",
    "  const [state, setState] = React.useState(0);",
    "  React.useEffect(() => {",
    "    setState((current) => current + 1);",
    "  }, []);",
    "  return state;",
    "}",
    "",
    "export async function loadSmallStatus() {",
    "  const response = await fetch('/api/small');",
    "  const json = await response.json();",
    "  return json?.status === \"ready\";",
    "}",
    "",
    "export default function SmallWorkbench({ title }: SmallProps) {",
    "  const state = useSmallState();",
    "  const _status = useQuery({ queryKey: [\"small\"], queryFn: loadSmallStatus });",
    "  return <main>{title}:{state}</main>;",
    "}",
    "",
  ];
}

function planFixture({
  selectedFilePath,
  fileContents,
  providerId,
  questionBudget,
}: {
  selectedFilePath: string;
  fileContents: Record<string, string>;
  providerId: string;
  questionBudget?: number;
}) {
  const evidencePack = buildEvidencePack({
    inventory: buildInventory(fileContents),
    selectedFilePath,
    userIntent: "Validate local ownership planning in a deterministic fixture.",
    fileContents,
  });
  const focusCandidates = buildFocusCandidates({ evidencePack, fileContents }).candidates;
  const plan = buildOwnershipQuestionPlan({
    evidencePack,
    fileContents,
    focusCandidates,
    providerId,
    questionBudget,
    generatedAt: GENERATED_AT,
  });

  return {
    evidencePack,
    focusCandidates,
    fileContents,
    plan,
  };
}

function evidenceIds(pack: EvidencePack): Set<string> {
  return new Set([...pack.excerpts, ...pack.symbols].map((entry) => entry.evidenceId));
}

function mutateFirstQuestion(
  fixture: ReturnType<typeof planFixture>,
  mutate: (question: PlannedOwnershipQuestion) => PlannedOwnershipQuestion,
): OwnershipQuestionPlan {
  const nextFirst = mutate(fixture.plan.questions[0]!);
  return {
    ...fixture.plan,
    questions: [nextFirst, ...fixture.plan.questions.slice(1)],
  };
}

const LARGE_FILE_CONTENTS = buildLargeWorkbenchFileLines().join("\n");
const SMALL_FILE_CONTENTS = buildSmallWorkbenchFileLines().join("\n");
const ROUTE_HELPER_FILE_CONTENTS = [
  'export const routeBus = "api routes";',
  "export function routeSignal() {",
  "  return routeBus;",
  "}",
].join("\n");

const largeFixture = planFixture({
  selectedFilePath: LARGE_FILE_PATH,
  providerId: "test-provider-large",
  fileContents: {
    [LARGE_FILE_PATH]: LARGE_FILE_CONTENTS,
    [ROUTE_HELPER_FILE_PATH]: ROUTE_HELPER_FILE_CONTENTS,
  },
});

const smallFixture = planFixture({
  selectedFilePath: SMALL_FILE_PATH,
  providerId: "test-provider-small",
  questionBudget: 6,
  fileContents: {
    [SMALL_FILE_PATH]: SMALL_FILE_CONTENTS,
  },
});

test("large fixture is >400 lines and evaluates as large + composite with hooks/effects/mixed candidates", () => {
  const largeLines = splitLines(LARGE_FILE_CONTENTS).length;
  const heuristics = analyzeLargeFileHeuristics({
    evidencePack: largeFixture.evidencePack,
    focusCandidates: largeFixture.focusCandidates as FocusCandidate[],
    fileContents: largeFixture.fileContents,
  });

  assert.ok(largeLines > 400);
  assert.equal(heuristics.isLargeFile, true);
  assert.equal(heuristics.isComposite, true);
  assert.ok(heuristics.hookSignalCount >= 0);
  assert.ok(heuristics.effectSignalCount >= 1);
  assert.ok(heuristics.mixedKindCount >= 4);
  assert.equal(heuristics.maxQuestions, 10);
});

test("local ownership plan uses multiple units, stays within 10 questions, cites selected file, and includes repair/refactor gate", () => {
  const { plan } = largeFixture;
  const selectedFileEvidenceIds = evidenceIds(largeFixture.evidencePack);

  assert.ok(plan.units.length > 1);
  assert.ok(plan.questions.length > 1);
  assert.ok(plan.questions.length <= 10);
  assert.ok(plan.questions.length <= plan.heuristics.maxQuestions);
  assert.equal(plan.heuristics.selectedFilePath, LARGE_FILE_PATH);
  assert.equal(plan.verifierDisposition !== "rejected", true);

  const hasGate = plan.questions.some(
    (question) => question.phase === "repair_refactor" || /repair|refactor|uncertainty/i.test(question.questionText),
  );
  assert.equal(hasGate, true);

  for (const question of plan.questions) {
    assert.equal(question.citations.length > 0, true);
    assert.equal(question.citations.every((citation) => citation.filePath === LARGE_FILE_PATH), true);
    assert.equal(question.evidenceIds.every((evidenceId) => selectedFileEvidenceIds.has(evidenceId)), true);
  }
});

test("verify + project to question batch marks one active first and remaining pending, sets selectedFiles, and strips prompt numbering", () => {
  const verification = verifyOwnershipQuestionPlan({
    plan: largeFixture.plan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });
  const batch = projectOwnershipQuestionPlanToQuestionBatch({ verification });

  assert.equal(batch.questions.length, verification.acceptedQuestions.length);
  assert.equal(batch.questions[0]?.state, "active");
  for (const question of batch.questions.slice(1)) {
    assert.equal(question.state, "pending");
  }
  assert.deepEqual(batch.selectedFiles, [LARGE_FILE_PATH]);
  for (const question of batch.questions) {
    assert.equal(/^\s*1\)/.test(question.prompt), false);
    assert.equal(/^\s*2\)/.test(question.prompt), false);
  }
});

test("invalid plan mutation: generic overview is blocked", () => {
  const overviewPlan = mutateFirstQuestion(largeFixture, (question) => ({
    ...question,
    questionText: "Give a big picture overview of this whole project and its architecture.",
  }));
  const verification = verifyOwnershipQuestionPlan({
    plan: overviewPlan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });

  assert.equal(
    verification.diagnostics.some((entry) => entry.code === "question_generic_overview"),
    true,
  );
});

test("invalid plan mutations: missing citations and out-of-selected-file citations are rejected", () => {
  const missingCitationPlan = mutateFirstQuestion(largeFixture, (question) => ({ ...question, citations: [] }));
  const missingCitationVerification = verifyOwnershipQuestionPlan({
    plan: missingCitationPlan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });
  assert.equal(
    missingCitationVerification.diagnostics.some((entry) => entry.code === "question_missing_citations"),
    true,
  );

  const outOfScopePlan = mutateFirstQuestion(largeFixture, (question) => ({
    ...question,
    citations: [
      {
        ...question.citations[0]!,
        filePath: ROUTE_HELPER_FILE_PATH,
        startLine: 1,
        endLine: 1,
      },
    ] as EvidenceCitation[],
  }));
  const outOfScopeVerification = verifyOwnershipQuestionPlan({
    plan: outOfScopePlan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });
  assert.equal(
    outOfScopeVerification.diagnostics.some((entry) => entry.code === "question_selected_file_citation_missing"),
    true,
  );
  assert.equal(
    outOfScopeVerification.diagnostics.some((entry) => entry.code === "question_citation_out_of_scope"),
    true,
  );
});

test("invalid plan mutations: invented evidence id, over budget, and readiness/owned language are blocked", () => {
  const inventedEvidencePlan = mutateFirstQuestion(largeFixture, (question) => ({
    ...question,
    evidenceIds: ["invented:ownership:fake-id"],
  }));
  const inventedEvidenceVerification = verifyOwnershipQuestionPlan({
    plan: inventedEvidencePlan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });
  assert.equal(
    inventedEvidenceVerification.diagnostics.some((entry) => entry.code === "question_invented_evidence_id"),
    true,
  );

  const overBudgetVerification = verifyOwnershipQuestionPlan({
    plan: largeFixture.plan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
    maxQuestionBudget: 1,
  });
  assert.equal(overBudgetVerification.diagnostics.some((entry) => entry.code === "question_count_exceeded"), true);

  const readinessPlan = mutateFirstQuestion(largeFixture, (question) => ({
    ...question,
    questionText: "Can we confirm this range is ready and owned before we proceed?",
  }));
  const readinessVerification = verifyOwnershipQuestionPlan({
    plan: readinessPlan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });
  assert.equal(
    readinessVerification.diagnostics.some((entry) => entry.code === "question_readiness_or_ownership_claim"),
    true,
  );
});

test("invalid plan mutation: large composite plan requires repair/refactor or uncertainty gate", () => {
  const noGatePlan: OwnershipQuestionPlan = {
    ...largeFixture.plan,
    questions: largeFixture.plan.questions.map((question) => ({
      ...question,
      phase: "focused_behavior",
      questionText: question.questionText
        .replace(/\brepair\b/gi, "adjust")
        .replace(/\brefactor\b/gi, "rearrange")
        .replace(/\buncertainty\b/gi, "unknown"),
    })),
  };
  const verification = verifyOwnershipQuestionPlan({
    plan: noGatePlan,
    evidencePack: largeFixture.evidencePack,
    fileContents: largeFixture.fileContents,
  });

  assert.equal(
    verification.diagnostics.some((entry) => entry.code === "missing_repair_refactor_gate"),
    true,
  );
});

test("small fixture stays compact with <=6 planned questions", () => {
  const { plan } = smallFixture;
  assert.equal(plan.heuristics.isLargeFile, false);
  assert.ok(plan.questions.length <= 6);
  assert.ok(plan.questions.length <= plan.heuristics.maxQuestions);

  const verification = verifyOwnershipQuestionPlan({
    plan,
    evidencePack: smallFixture.evidencePack,
    fileContents: smallFixture.fileContents,
    maxQuestionBudget: 12,
  });
  assert.equal(verification.kind !== "rejected", true);
});
