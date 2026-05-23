import {
  fail,
  now,
  toOperationState,
  type ArtifactSession,
  type LearningGap,
  type PracticeChallenge,
  type PracticeChallengeDifficulty,
  type PracticeChallengeDueAfter,
  type PracticeChallengeType,
  type RuntimeSuccess,
} from "./runtime-support.ts";
import { getArtifactSession, readState, writeState } from "./persistence/state.ts";

function dueAfterFor(gap: LearningGap): PracticeChallengeDueAfter {
  switch (gap.severity) {
    case "critical":
      return "now";
    case "important":
      return "24h";
    case "later":
      return "7d";
  }
}

function difficultyFor(gap: LearningGap): PracticeChallengeDifficulty {
  if (gap.severity === "critical") return "hard";
  if (gap.severity === "important") return "medium";
  return "easy";
}

function challengeTypeFor(gap: LearningGap): PracticeChallengeType {
  if (/test|assert|coverage/i.test(gap.repair_action) || /test/i.test(gap.concept_label)) {
    return "write_or_adjust_test";
  }
  if (gap.severity === "critical") return "trace_path_across_files";
  if (gap.observed_layer <= 1) return "explain_flow_without_looking";
  if (gap.expected_layer >= 4) return "predict_side_effect";
  return "compare_design_alternatives";
}

function revisitAfter(createdAt: string, dueAfter: PracticeChallengeDueAfter): string {
  const created = new Date(createdAt);
  const hours = dueAfter === "now" ? 0 : dueAfter === "24h" ? 24 : 24 * 7;
  return new Date(created.getTime() + hours * 60 * 60 * 1000).toISOString();
}

function evidenceLabel(gap: LearningGap): string {
  return gap.artifact_evidence
    .map((entry) => `${entry.file_path}:${entry.start_line}-${entry.end_line}`)
    .join(", ");
}

function promptFor(gap: LearningGap, challengeType: PracticeChallengeType): string {
  const evidence = evidenceLabel(gap) || "the cited artifact evidence";
  switch (challengeType) {
    case "trace_path_across_files":
      return `Trace ${gap.concept_label} from the cited evidence through its nearest boundary or downstream effect. Produce a short step-by-step path using ${evidence}.`;
    case "explain_flow_without_looking":
      return `Explain ${gap.concept_label} without looking first, then check against ${evidence} and mark what was missing.`;
    case "predict_side_effect":
      return `Predict one concrete side effect of changing ${gap.concept_label}, and justify it from ${evidence}.`;
    case "write_or_adjust_test":
      return `Write or adjust one test idea that would expose the gap in ${gap.concept_label}, citing ${evidence}.`;
    case "compare_design_alternatives":
      return `Compare two possible responsibilities for ${gap.concept_label}, then choose the one supported by ${evidence}.`;
    case "small_modification":
      return `Describe one small modification to ${gap.concept_label} and the evidence you would inspect before making it.`;
    case "rebuild_smaller_version":
      return `Rebuild a smaller version of ${gap.concept_label}'s flow in notes or pseudocode and cite the evidence that validates it.`;
    case "transfer_to_second_artifact":
      return `Find a second artifact with a similar responsibility and explain how ${gap.concept_label} transfers or differs.`;
  }
}

function expectedEvidenceFor(gap: LearningGap): string[] {
  const citedEvidence = gap.artifact_evidence.map((entry) =>
    `artifact=${entry.file_path}:${entry.start_line}-${entry.end_line} excerpt=${entry.excerpt}`,
  );
  return [
    `gap_id=${gap.id}`,
    `concept_id=${gap.concept_id}`,
    `produce=written explanation, trace, prediction, or test idea that directly repairs the detected gap`,
    `counts=must cite artifact evidence and address suspected misconception: ${gap.suspected_misconception}`,
    ...citedEvidence,
  ];
}

function challengeFromGap(artifactSession: ArtifactSession, gap: LearningGap): PracticeChallenge {
  if (!gap.artifact_session_id) {
    fail("gap_without_artifact_session", `Gap ${gap.id} is not tied to an artifact session.`);
  }
  if (gap.artifact_session_id !== artifactSession.artifact_session_id) {
    fail("gap_artifact_mismatch", `Gap ${gap.id} does not belong to artifact session ${artifactSession.artifact_session_id}.`);
  }
  if (gap.artifact_evidence.length === 0) {
    fail("gap_without_evidence", `Gap ${gap.id} has no artifact evidence for practice.`);
  }

  const createdAt = now();
  const dueAfter = dueAfterFor(gap);
  const challengeType = challengeTypeFor(gap);
  return {
    id: `practice-${gap.id}`,
    artifact_session_id: artifactSession.artifact_session_id,
    session_id: gap.session_id,
    concept_id: gap.concept_id,
    gap_id: gap.id,
    challenge_type: challengeType,
    prompt: promptFor(gap, challengeType),
    expected_evidence: expectedEvidenceFor(gap),
    difficulty: difficultyFor(gap),
    due_after: dueAfter,
    revisit_after: revisitAfter(createdAt, dueAfter),
    completion_state: "pending",
    created_at: createdAt,
  };
}

function selectGaps(artifactSession: ArtifactSession, gapIDs: string[]): LearningGap[] {
  const gaps = artifactSession.learning_gaps ?? [];
  if (gapIDs.length === 0) return gaps;

  const selected = gaps.filter((gap) => gapIDs.includes(gap.id));
  const missing = gapIDs.filter((gapID) => !selected.some((gap) => gap.id === gapID));
  if (missing.length > 0) {
    fail("missing_learning_gap", `Learning gap ${missing[0]} was not found.`);
  }
  return selected;
}

export function generatePracticeChallengesCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session_id: string;
  practice_challenges: PracticeChallenge[];
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const gapIDs = Array.isArray(payload.gap_ids) ? payload.gap_ids.map(String) : [];
  const gaps = selectGaps(artifactSession, gapIDs);
  if (gaps.length === 0) {
    fail("missing_learning_gap", "No learning gaps are available for practice challenge generation.");
  }

  const existing = artifactSession.practice_challenges ?? [];
  const existingByGapID = new Map(existing.map((challenge) => [challenge.gap_id, challenge]));
  const challenges = gaps.map((gap) => existingByGapID.get(gap.id) ?? challengeFromGap(artifactSession, gap));
  const generatedGapIDs = new Set(challenges.map((challenge) => challenge.gap_id));
  artifactSession.practice_challenges = [
    ...existing.filter((challenge) => !generatedGapIDs.has(challenge.gap_id)),
    ...challenges,
  ];

  writeState(state);

  return {
    ok: true,
    data: {
      artifact_session_id: artifactSession.artifact_session_id,
      practice_challenges: challenges,
      operation_state: toOperationState("Practice challenges generated from learning gaps."),
    },
  };
}
