import { rmSync } from "node:fs";

import { handleRequest } from "../../runtime.ts";
import type { ArtifactSession, LearningGap, PracticeChallenge } from "../../runtime-support.ts";
import type { ReadinessReport } from "../../runtime-readiness.ts";
import { classifyLayer, qualityFor } from "./classifier.ts";
import { createBoundaryObservation, evidenceFor, materializeFixture } from "./fixtures.ts";
import { validateModelFixture } from "./model-fixture.ts";
import { canonicalChallengeType, challengeObservation, gapObservation, mismatch } from "./observations.ts";
import { seedRuntimeState } from "./runtime-seed.ts";
import type { BoundaryObservation, CaseObservation, CaseResult, EvalCase } from "./types.ts";

type Success<T> = { ok: true; data: T };

function createArtifactSession(testCase: EvalCase, root: string): ArtifactSession {
  const created = handleRequest({
    command: "create_artifact_session",
    payload: {
      label: testCase.title,
      root_path: root,
      source_type: "local_path",
      learning_goal: testCase.learning_goal,
      confidence: "medium",
      included_paths: testCase.artifact_boundary.included_paths,
      excluded_paths: testCase.artifact_boundary.excluded_paths.filter((entry) => !entry.startsWith("../")),
    },
  }) as Success<{ artifact_session: ArtifactSession }>;
  if (!created.ok) throw new Error("artifact session setup failed");
  return created.data.artifact_session;
}

function answerCase(testCase: EvalCase, artifactSession: ArtifactSession, root: string): {
  gap: LearningGap | null;
  challenge: PracticeChallenge | null;
  readiness: ReadinessReport["summary"] | null;
  memory: CaseObservation["memory"];
} {
  const seeded = seedRuntimeState({
    testCase,
    artifactSessionID: artifactSession.artifact_session_id,
    root,
    evidence: evidenceFor(testCase, root),
  });
  const answered = handleRequest({
    command: "answer_question",
    payload: {
      session_id: seeded.sessionID,
      question_id: seeded.questionID,
      answer: testCase.user_answer.text,
      answer_quality: qualityFor(testCase),
    },
  }) as Success<{ learning_gap?: LearningGap }>;
  if (!answered.ok) throw new Error("answer_question failed");

  const gap = answered.data.learning_gap ?? null;
  const challenge = gap ? generateChallenge(artifactSession.artifact_session_id, gap.id) : null;
  const memory = getMemory(artifactSession.artifact_session_id, testCase);
  const readiness = getReadiness(artifactSession.artifact_session_id);
  return { gap, challenge, memory, readiness };
}

function generateChallenge(artifactSessionID: string, gapID: string): PracticeChallenge | null {
  const generated = handleRequest({
    command: "generate_practice_challenges",
    payload: { artifact_session_id: artifactSessionID, gap_ids: [gapID] },
  }) as Success<{ practice_challenges: PracticeChallenge[] }>;
  return generated.ok ? generated.data.practice_challenges[0] ?? null : null;
}

function getMemory(artifactSessionID: string, testCase: EvalCase): CaseObservation["memory"] {
  const memoryResult = handleRequest({
    command: "get_understanding_memory",
    payload: { artifact_session_id: artifactSessionID },
  }) as Success<{ understanding_memory: { answer_history: unknown[]; gaps: unknown[]; challenges: unknown[] } }>;
  if (!memoryResult.ok) {
    return { answer_count: 0, gap_count: 0, challenge_count: 0, uncertainty_persisted: false };
  }
  const memory = memoryResult.data.understanding_memory;
  return {
    answer_count: memory.answer_history.length,
    gap_count: memory.gaps.length,
    challenge_count: memory.challenges.length,
    uncertainty_persisted: memory.answer_history.some((entry) => JSON.stringify(entry).includes(testCase.user_answer.text)),
  };
}

function getReadiness(artifactSessionID: string): ReadinessReport["summary"] | null {
  const ready = handleRequest({
    command: "readiness_report",
    payload: { artifact_session_id: artifactSessionID, format: "json" },
  }) as Success<{ readiness_report: ReadinessReport }>;
  return ready.ok ? ready.data.readiness_report.summary : null;
}

function validateObservations(testCase: EvalCase, observations: CaseObservation): CaseResult["mismatches"] {
  const mismatches: CaseResult["mismatches"] = [];
  mismatch(mismatches, "expected_layer.level", testCase.expected_layer.level, observations.classified_layer);
  mismatch(mismatches, "expected_gap.should_create", testCase.gap_readiness_expectations.create_gap, Boolean(observations.learning_gap));
  if (observations.learning_gap && testCase.expected_gap) {
    mismatch(mismatches, "expected_gap.severity", testCase.expected_gap.severity, observations.learning_gap.severity);
    mismatch(mismatches, "expected_gap.confidence", testCase.expected_gap.confidence, observations.learning_gap.confidence);
    mismatch(mismatches, "expected_gap.observed_layer", testCase.expected_gap.observed_layer, observations.learning_gap.observed_layer);
  }
  mismatch(mismatches, "expected_challenge.should_create", testCase.gap_readiness_expectations.create_challenge, Boolean(observations.challenge));
  if (observations.challenge && testCase.expected_challenge.challenge_type) {
    mismatch(
      mismatches,
      "expected_challenge.challenge_type",
      canonicalChallengeType(testCase.expected_challenge.challenge_type, testCase),
      observations.challenge.challenge_type,
    );
  }
  if (observations.readiness) {
    mismatch(mismatches, "expected_readiness.claim_allowed", true, testCase.gap_readiness_expectations.allowed_readiness_claims.includes(observations.readiness.readiness));
    mismatch(mismatches, "expected_readiness.has_evidence", testCase.expected_readiness.must_cite_evidence, observations.readiness.evidence_ids.length > 0);
  }
  if (testCase.gap_readiness_expectations.persist_declared_uncertainty) {
    mismatch(mismatches, "memory.persist_declared_uncertainty", true, observations.memory.uncertainty_persisted);
  }
  mismatch(mismatches, "boundary.reject_forbidden_evidence", testCase.boundary_expectations.reject_forbidden_evidence, observations.boundary.rejected_paths.length > 0);
  if (testCase.boundary_expectations.expected_rejection_reason) {
    mismatch(mismatches, "boundary.expected_rejection_reason", true, observations.boundary.rejection_reasons.includes(testCase.boundary_expectations.expected_rejection_reason));
  }
  return mismatches;
}

export function runEvalCase(testCase: EvalCase): CaseResult {
  const fixture = materializeFixture(testCase);
  const { root } = fixture;
  let gap: LearningGap | null = null;
  let challenge: PracticeChallenge | null = null;
  let readiness: ReadinessReport["summary"] | null = null;
  let boundary: BoundaryObservation = { accepted_paths: [], rejected_paths: [], rejection_reasons: [] };
  let memory: CaseObservation["memory"] = { answer_count: 0, gap_count: 0, challenge_count: 0, uncertainty_persisted: false };

  try {
    const artifactSession = createArtifactSession(testCase, root);
    if (testCase.llm_fixture_response) {
      const fixtureValidation = validateModelFixture(testCase, artifactSession);
      gap = fixtureValidation.gap;
      boundary = fixtureValidation.boundary;
      readiness = {
        readiness: "not ready yet",
        statement: "Rejected model fixture signals require bounded deterministic evidence before readiness can be accepted.",
        confidence: "high",
        evidence_ids: boundary.rejection_reasons,
      };
      memory = { ...memory, gap_count: 1 };
    } else {
      boundary = createBoundaryObservation(testCase, artifactSession);
      ({ gap, challenge, readiness, memory } = answerCase(testCase, artifactSession, root));
    }
  } finally {
    rmSync(fixture.cleanupRoot, { recursive: true, force: true });
  }

  const observations: CaseObservation = {
    expected_layer: testCase.expected_layer.level,
    classified_layer: classifyLayer(testCase),
    learning_gap: gapObservation(gap),
    challenge: challengeObservation(challenge, testCase),
    readiness,
    memory,
    boundary,
    model_called: false,
  };
  const mismatches = validateObservations(testCase, observations);
  return {
    id: testCase.id,
    title: testCase.title,
    case_class: testCase.case_class,
    passed: mismatches.length === 0,
    observations,
    mismatches,
  };
}
