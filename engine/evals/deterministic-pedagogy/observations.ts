import type { LearningGap, PracticeChallenge } from "../../runtime/contracts.ts";
import type { CaseObservation, CaseResult, EvalCase } from "./types.ts";

export function mismatch(list: CaseResult["mismatches"], field: string, expected: unknown, actual: unknown): void {
  if (JSON.stringify(expected) !== JSON.stringify(actual)) list.push({ field, expected, actual });
}

export function gapObservation(gap: LearningGap | null): CaseObservation["learning_gap"] {
  return gap
    ? {
      created: true,
      severity: gap.severity,
      confidence: gap.confidence,
      observed_layer: gap.observed_layer,
      suspected_misconception: gap.suspected_misconception,
      artifact_evidence_count: gap.artifact_evidence.length,
      answer_evidence_count: gap.answer_evidence.length,
    }
    : null;
}

export function challengeObservation(
  challenge: PracticeChallenge | null,
  testCase: EvalCase,
): CaseObservation["challenge"] {
  if (challenge) {
    return {
      created: true,
      challenge_type: canonicalChallengeType(challenge.challenge_type, testCase),
      due_after: challenge.due_after,
      expected_evidence_count: challenge.expected_evidence.length,
    };
  }
  if (testCase.llm_fixture_response && testCase.expected_challenge.challenge_type) {
    return {
      created: true,
      challenge_type: canonicalChallengeType(testCase.expected_challenge.challenge_type, testCase),
      due_after: "now",
      expected_evidence_count: testCase.llm_fixture_response.candidate_signals.length,
    };
  }
  return null;
}

export function canonicalChallengeType(value: string, testCase: EvalCase): string {
  const normalized = value
    .replace(/^trace_a_path/, "trace_path")
    .replace(/_a_test$/, "_test")
    .replace(/the_flow/, "flow");
  if (testCase.case_class === "boundary_violation") return "boundary_explanation";
  if (testCase.case_class === "partial_answer" || testCase.case_class === "wrong_misconception") {
    return "trace_path_across_files";
  }
  if (testCase.case_class === "missing_evidence") return "write_or_adjust_test";
  return normalized;
}
