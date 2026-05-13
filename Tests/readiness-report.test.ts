import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { handleRequest } from "../src/runtime.ts";
import type { AutopsyStep, ConceptGraph, LearningGap, PracticeChallenge } from "../src/runtime-support.ts";
import type { ReadinessReport } from "../src/runtime-readiness.ts";

type Success<T> = { ok: true; data: T };

function withTempHome(): void {
  process.env.SIBI_RUNTIME_HOME = mkdtempSync(join(tmpdir(), "sibar-runtime-"));
}

function expectSuccess<T>(value: unknown): Success<T> {
  const result = value as Success<T> | { ok: false; error: { message: string } };
  assert.equal(result.ok, true);
  return result as Success<T>;
}

function createReadinessFixture(): string {
  const root = mkdtempSync(join(tmpdir(), "sibar-readiness-"));
  const src = join(root, "src");
  const tests = join(root, "Tests");
  mkdirSync(src, { recursive: true });
  mkdirSync(tests);

  writeFileSync(join(src, "runtime.ts"), [
    "import { readState, writeState } from './runtime-state.ts';",
    "import { generatePractice } from './runtime-practice.ts';",
    "export function handleRequest(request: { command: string }) {",
    "  if (request.command === 'answer_question') return writeState(readState());",
    "  if (request.command === 'generate_practice_challenges') return generatePractice();",
    "  return null;",
    "}",
  ].join("\n"));
  writeFileSync(join(src, "runtime-state.ts"), [
    "import { readFileSync, writeFileSync } from 'node:fs';",
    "export function readState() { return JSON.parse(readFileSync('state.json', 'utf8')); }",
    "export function writeState(value: unknown) { return writeFileSync('state.json', JSON.stringify(value)); }",
  ].join("\n"));
  writeFileSync(join(src, "runtime-practice.ts"), [
    "export function generatePractice() { return { due_after: '24h' }; }",
  ].join("\n"));
  writeFileSync(join(tests, "runtime.test.ts"), [
    "import test from 'node:test';",
    "test('readiness fixture', () => {});",
  ].join("\n"));

  return root;
}

function prepareAutopsy(artifactSessionID: string, conceptID: string): AutopsyStep {
  return expectSuccess<{ autopsy_step: AutopsyStep }>(handleRequest({
    command: "prepare_autopsy_step",
    payload: { artifact_session_id: artifactSessionID, concept_id: conceptID },
  })).data.autopsy_step;
}

function createReportFixture(): {
  artifactSessionID: string;
  gap: LearningGap;
  challenge: PracticeChallenge;
  confirmedConceptID: string;
} {
  withTempHome();
  const root = createReadinessFixture();
  const created = expectSuccess<{ artifact_session: { artifact_session_id: string } }>(handleRequest({
    command: "create_artifact_session",
    payload: {
      label: "Readiness report fixture",
      root_path: root,
      source_type: "local_path",
      learning_goal: "Export evidence-backed readiness",
      confidence: "medium",
      included_paths: ["src", "Tests"],
      excluded_paths: [],
    },
  }));
  const artifactSessionID = created.data.artifact_session.artifact_session_id;
  const graph = expectSuccess<{ concept_graph: ConceptGraph }>(handleRequest({
    command: "build_concept_graph",
    payload: { artifact_session_id: artifactSessionID },
  })).data.concept_graph;
  const gapConceptID = graph.nodes[0].id;
  const confirmedConceptID = graph.nodes.find((node) => node.id !== gapConceptID)?.id;
  assert.ok(confirmedConceptID);

  const gapStep = prepareAutopsy(artifactSessionID, gapConceptID);
  const gap = expectSuccess<{ learning_gap: LearningGap }>(handleRequest({
    command: "answer_question",
    payload: {
      session_id: gapStep.session_id,
      question_id: gapStep.question_id,
      answer: "I know this handles commands, but I cannot trace the state persistence evidence yet.",
      answer_quality: "partial",
    },
  })).data.learning_gap;
  const challenge = expectSuccess<{ practice_challenges: PracticeChallenge[] }>(handleRequest({
    command: "generate_practice_challenges",
    payload: { artifact_session_id: artifactSessionID, gap_ids: [gap.id] },
  })).data.practice_challenges[0];

  const confirmedStep = prepareAutopsy(artifactSessionID, confirmedConceptID);
  expectSuccess(handleRequest({
    command: "answer_question",
    payload: {
      session_id: confirmedStep.session_id,
      question_id: confirmedStep.question_id,
      answer:
        "This concept is ready to explain because the cited files show the runtime boundary, state reads, and write path that preserve artifact memory across resumed sessions.",
      answer_quality: "verified",
    },
  }));

  return { artifactSessionID, gap, challenge, confirmedConceptID };
}

function assertClaimEvidence(report: ReadinessReport): void {
  const evidenceIDs = new Set(report.evidence_index.map((entry) => entry.evidence_id));
  const claims = [
    ...report.ready_areas,
    ...report.risky_areas,
    ...report.verified_concepts,
    ...report.open_gaps,
    ...report.practice_queue,
    report.recommended_next_action,
  ];
  for (const claim of claims) {
    assert.ok(claim.evidence_ids.length > 0 || claim.unsupported, `${claim.claim_id} lacks evidence`);
    for (const evidenceID of claim.evidence_ids) {
      assert.ok(evidenceIDs.has(evidenceID), `${claim.claim_id} cites missing evidence ${evidenceID}`);
    }
  }
  assert.ok(report.summary.evidence_ids.length > 0 || report.summary.unsupported);
}

test("readiness_report emits JSON claims with evidence citations for every supported claim", () => {
  const fixture = createReportFixture();
  const result = expectSuccess<{ readiness_report: ReadinessReport }>(handleRequest({
    command: "readiness_report",
    payload: { artifact_session_id: fixture.artifactSessionID, format: "json" },
  }));
  const report = result.data.readiness_report;

  assert.equal(report.artifact_session_id, fixture.artifactSessionID);
  assert.ok(report.ready_areas.length >= 1);
  assert.ok(report.verified_concepts.some((concept) => concept.concept_id === fixture.confirmedConceptID));
  assert.ok(report.open_gaps.some((gap) => gap.gap_id === fixture.gap.id));
  assert.ok(report.practice_queue.some((challenge) => challenge.challenge_id === fixture.challenge.id));
  assert.equal(report.summary.readiness, "not ready yet");
  assert.ok(report.evidence_index.length > 0);
  assertClaimEvidence(report);

  const reloaded = expectSuccess<{ artifact_session: { readiness_reports: ReadinessReport[] } }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.readiness_reports.length, 1);
  assert.equal(reloaded.data.artifact_session.readiness_reports[0].artifact_session_id, fixture.artifactSessionID);
});

test("readiness_report markdown includes cited readiness sections and evidence index", () => {
  const fixture = createReportFixture();
  const result = expectSuccess<{ readiness_report: ReadinessReport; markdown: string }>(handleRequest({
    command: "readiness_report",
    payload: { artifact_session_id: fixture.artifactSessionID, format: "both" },
  }));
  const markdown = result.data.markdown;

  assert.match(markdown, /## Ready Areas/);
  assert.match(markdown, /## Risky Areas/);
  assert.match(markdown, /## Open Gaps/);
  assert.match(markdown, /## Practice Queue/);
  assert.match(markdown, /## Recommended Next Action/);
  assert.match(markdown, /## Evidence Index/);
  for (const entry of result.data.readiness_report.evidence_index) {
    assert.ok(markdown.includes(`[${entry.evidence_id}]`));
  }
  assert.ok(markdown.includes(fixture.gap.repair_action));
  assertClaimEvidence(result.data.readiness_report);
});

test("readiness_report persists only the last five reports", () => {
  const fixture = createReportFixture();
  for (let index = 0; index < 6; index += 1) {
    expectSuccess(handleRequest({
      command: "readiness_report",
      payload: { artifact_session_id: fixture.artifactSessionID, format: "json" },
    }));
  }

  const reloaded = expectSuccess<{ artifact_session: { readiness_reports: ReadinessReport[] } }>(handleRequest({
    command: "get_artifact_session",
    payload: { artifact_session_id: fixture.artifactSessionID },
  }));
  assert.equal(reloaded.data.artifact_session.readiness_reports.length, 5);
  assert.ok(reloaded.data.artifact_session.readiness_reports.every((report) =>
    report.artifact_session_id === fixture.artifactSessionID,
  ));
});
