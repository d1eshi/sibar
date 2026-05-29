import test from "node:test";
import assert from "node:assert/strict";

import {
  buildFocusCandidates,
  buildFocusQuestionOperationSeed,
  buildQuestionBatchFromLanguageProposal,
  buildQuestionQueueProjection,
  findFocusCandidateForCitation,
  type EvidenceCitationLike,
  type EvidencePackLike,
  type ProposalLike,
  type ProposalVerificationLike,
  type VerifiedClaimLike,
} from "../engine/workbench/focus-question/index.ts";

const fileContents = {
  "src/api/session.ts": [
    "import { fetchJson } from './http';",
    "",
    "export function createSession(userId: string) {",
    "  const path = `/session/${userId}`;",
    "  return fetchJson(path);",
    "}",
  ].join("\n"),
  "src/api/sessionConsumer.ts": [
    "import { createSession } from './session';",
    "export const run = () => createSession('u2');",
  ].join("\n"),
};

function citation(evidenceId: string, startLine: number, endLine: number, symbol?: string): EvidenceCitationLike {
  return {
    evidenceId,
    filePath: "src/api/session.ts",
    startLine,
    endLine,
    symbol,
  };
}

function pack(): EvidencePackLike {
  return {
    selectedFilePath: "src/api/session.ts",
    userIntent: "Understand session ownership.",
    excerpts: [
      {
        ...citation("src/api/session.ts:3-6:excerpt", 3, 6, "createSession"),
        text: [
          "export function createSession(userId: string) {",
          "  const path = `/session/${userId}`;",
          "  return fetchJson(path);",
          "}",
        ].join("\n"),
      },
      {
        ...citation("src/api/session.ts:5-5:excerpt", 5, 5),
        text: "  return fetchJson(path);",
      },
    ],
    symbols: [
      {
        ...citation("src/api/session.ts:3-6:symbol:createSession", 3, 6, "createSession"),
        name: "createSession",
        kind: "function",
        text: [
          "export function createSession(userId: string) {",
          "  const path = `/session/${userId}`;",
          "  return fetchJson(path);",
          "}",
        ].join("\n"),
        confidence: "observed",
      },
    ],
  };
}

function proposal(): ProposalLike {
  return {
    providerId: "test-provider",
    generatedAt: "2026-01-01T00:00:00.000Z",
    selectedFilePath: "src/api/session.ts",
    runtimeTrace: { model: "mock-gemini" },
  };
}

function verifiedQuestion(id: string, text: string, ref: EvidenceCitationLike): VerifiedClaimLike {
  return {
    id,
    kind: "question",
    text,
    confidence: "observed",
    citations: [ref],
    disposition: "accepted",
    reasons: [],
  };
}

test("engine focus candidates keep stable ids and map verified citations", () => {
  const evidencePack = pack();
  const first = buildFocusCandidates({ evidencePack, fileContents });
  const second = buildFocusCandidates({ evidencePack, fileContents });

  assert.equal(first.schema, "sibi-focus-candidates.v1");
  assert.deepEqual(
    first.candidates.map((candidate) => candidate.id),
    second.candidates.map((candidate) => candidate.id),
  );

  const functionCitation = evidencePack.excerpts[0];
  assert.ok(functionCitation);
  const candidate = findFocusCandidateForCitation(first.candidates, functionCitation);
  assert.ok(candidate);
  assert.equal(candidate.symbol, "createSession");
  assert.equal(candidate.kind, "function");
  assert.equal(candidate.startLine, 3);
  assert.equal(candidate.endLine, 6);
});

test("engine question batch blocks questions without a focus candidate", () => {
  const focus = buildFocusCandidates({ evidencePack: pack(), fileContents });
  const outsideCitation: EvidenceCitationLike = {
    evidenceId: "src/api/sessionConsumer.ts:2-2:repo-search:createSession",
    filePath: "src/api/sessionConsumer.ts",
    startLine: 2,
    endLine: 2,
  };
  const verification: ProposalVerificationLike = {
    kind: "accepted",
    acceptedClaims: [verifiedQuestion("caller-question", "Explain the caller ownership.", outsideCitation)],
    questions: [],
    rejectedClaims: [],
    reasons: [],
  };

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal: proposal(),
    verification,
    focusCandidates: focus.candidates,
  });

  assert.equal(batch.questions.length, 0);
  assert.ok(batch.rejectedQuestionIds.includes("caller-question"));
  assert.equal(batch.diagnostics.some((entry) => entry.code === "question_without_focus"), true);
});

test("engine queue selects the first attemptable question and exposes pedagogy seeds", () => {
  const evidencePack = pack();
  const focus = buildFocusCandidates({ evidencePack, fileContents });
  const functionCitation = evidencePack.excerpts[0];
  assert.ok(functionCitation);
  const verification: ProposalVerificationLike = {
    kind: "accepted",
    acceptedClaims: [
      verifiedQuestion(
        "trace-question",
        "Can you trace why createSession builds the path before fetchJson?",
        functionCitation,
      ),
      verifiedQuestion(
        "predict-question",
        "What could break if createSession stopped using fetchJson?",
        functionCitation,
      ),
    ],
    questions: [],
    rejectedClaims: [],
    reasons: [],
  };

  const batch = buildQuestionBatchFromLanguageProposal({
    proposal: proposal(),
    verification,
    focusCandidates: focus.candidates,
  });
  const queue = buildQuestionQueueProjection({ batch });

  assert.equal(queue.activeQuestionId, batch.questions[0]?.id);
  assert.equal(queue.activeFocusCandidateId, batch.questions[0]?.focusCandidateId);
  assert.equal(queue.progress.total, 2);
  assert.equal(batch.questions[0]?.operationKind, "trace");
  assert.equal(batch.questions[0]?.answerStyle, "system_walkthrough");
  assert.equal(batch.questions[1]?.operationKind, "predict");

  const activeFocus = focus.candidates.find((candidate) => candidate.id === queue.activeFocusCandidateId);
  const activeQuestion = batch.questions[0];
  assert.ok(activeFocus);
  assert.ok(activeQuestion);
  const seed = buildFocusQuestionOperationSeed(activeFocus, activeQuestion);
  assert.equal(seed.evidenceRef.file_path, "src/api/session.ts");
  assert.equal(seed.operation.kind, "trace");
  assert.equal(seed.artifact.kind, "code_slice");
});
