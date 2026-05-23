import { randomUUID } from "node:crypto";
import { assertArtifactAllowsPath } from "../../artifacts/session.ts";
import type { ArtifactSession, LearningGap } from "../../runtime-support.ts";
import type { BoundaryObservation, EvalCase } from "./types.ts";

export function validateModelFixture(testCase: EvalCase, artifactSession: ArtifactSession): {
  boundary: BoundaryObservation;
  gap: LearningGap;
} {
  if (!testCase.llm_fixture_response) throw new Error("Missing LLM fixture.");

  const rejected_paths: string[] = [];
  const rejection_reasons: string[] = [];
  const accepted_paths: string[] = [];

  for (const signal of testCase.llm_fixture_response.candidate_signals) {
    if (signal.citations.length === 0) {
      rejected_paths.push("<missing citation>");
      rejection_reasons.push("missing_or_forbidden_citation");
      continue;
    }

    for (const citation of signal.citations) {
      try {
        accepted_paths.push(assertArtifactAllowsPath(citation.path, artifactSession));
      } catch {
        rejected_paths.push(citation.path);
        rejection_reasons.push("missing_or_forbidden_citation");
      }
    }
  }

  return {
    boundary: { accepted_paths, rejected_paths, rejection_reasons },
    gap: {
      id: randomUUID(),
      artifact_session_id: artifactSession.artifact_session_id,
      session_id: randomUUID(),
      question_id: randomUUID(),
      concept_id: testCase.concept_under_test.id,
      concept_label: testCase.concept_under_test.label,
      expected_layer: testCase.concept_under_test.layer_target,
      observed_layer: 1,
      observed_answer_or_uncertainty: "Rejected offline LLM fixture response.",
      artifact_evidence: [],
      answer_evidence: rejected_paths,
      suspected_misconception: testCase.expected_misconception?.label ?? "LLM candidate signal lacked deterministic evidence.",
      severity: "critical",
      confidence: "high",
      repair_action: "Reject model confidence unless deterministic evidence and boundary checks pass.",
      created_at: new Date().toISOString(),
    },
  };
}
