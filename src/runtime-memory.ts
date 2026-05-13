import {
  now,
  toOperationState,
  type ArtifactSession,
  type ConceptUnderstandingState,
  type EvidenceCitation,
  type LearningGap,
  type PracticeChallenge,
  type RuntimeSuccess,
  type UnderstandingMemory,
  type UnderstandingMemoryAnswer,
  type UnderstandingMemoryConcept,
  type UnderstandingMemoryReview,
} from "./runtime-support.ts";
import { getArtifactSession, readState } from "./runtime-state.ts";

function answerFromEvidence(answerEvidence: string[]): string {
  const entry = answerEvidence.find((candidate) => candidate.startsWith("answer="));
  return entry ? entry.slice("answer=".length) : "";
}

function addDays(value: string, days: number): string {
  const date = new Date(value);
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function minTimestamp(values: string[]): string | undefined {
  return values.sort()[0];
}

function challengeReview(challenge: PracticeChallenge, gapByID: Map<string, LearningGap>): UnderstandingMemoryReview {
  return {
    concept_id: challenge.concept_id,
    concept_label: gapByID.get(challenge.gap_id)?.concept_label ?? challenge.concept_id,
    next_review_at: challenge.revisit_after,
    reason: "pending_challenge",
    challenge_id: challenge.id,
    gap_id: challenge.gap_id,
  };
}

function confirmedReview(state: ConceptUnderstandingState): UnderstandingMemoryReview {
  return {
    concept_id: state.concept_id,
    concept_label: state.concept_label,
    next_review_at: addDays(state.updated_at, 7),
    reason: "confirmed_review",
  };
}

function gapReview(gap: LearningGap): UnderstandingMemoryReview {
  return {
    concept_id: gap.concept_id,
    concept_label: gap.concept_label,
    next_review_at: addDays(gap.created_at, 1),
    reason: "gap_repair",
    gap_id: gap.id,
  };
}

function sortedReviews(reviews: UnderstandingMemoryReview[]): UnderstandingMemoryReview[] {
  return [...reviews].sort((left, right) =>
    left.next_review_at.localeCompare(right.next_review_at)
      || left.concept_id.localeCompare(right.concept_id)
      || (left.challenge_id ?? left.gap_id ?? "").localeCompare(right.challenge_id ?? right.gap_id ?? ""),
  );
}

function groupByConcept<T extends { concept_id: string }>(entries: T[]): Map<string, T[]> {
  const grouped = new Map<string, T[]>();
  for (const entry of entries) {
    grouped.set(entry.concept_id, [...(grouped.get(entry.concept_id) ?? []), entry]);
  }
  return grouped;
}

function answersFromGaps(gaps: LearningGap[]): UnderstandingMemoryAnswer[] {
  return gaps.map((gap) => ({
    answer_id: `gap-${gap.id}`,
    session_id: gap.session_id,
    question_id: gap.question_id,
    concept_id: gap.concept_id,
    concept_label: gap.concept_label,
    answer: gap.observed_answer_or_uncertainty,
    outcome: "gap",
    confidence: gap.confidence,
    created_at: gap.created_at,
    evidence: gap.artifact_evidence,
  }));
}

function answersFromStates(states: ConceptUnderstandingState[]): UnderstandingMemoryAnswer[] {
  return states.map((state) => ({
    answer_id: `state-${state.concept_id}-${state.question_id}`,
    session_id: state.session_id,
    question_id: state.question_id,
    concept_id: state.concept_id,
    concept_label: state.concept_label,
    answer: answerFromEvidence(state.answer_evidence),
    outcome: "confirmed",
    confidence: state.confidence,
    created_at: state.updated_at,
    evidence: state.evidence,
  }));
}

function conceptEvidence(
  conceptID: string,
  graphEvidence: Map<string, EvidenceCitation[]>,
  statesByConcept: Map<string, ConceptUnderstandingState>,
  gapsByConcept: Map<string, LearningGap[]>,
): EvidenceCitation[] {
  return graphEvidence.get(conceptID)
    ?? statesByConcept.get(conceptID)?.evidence
    ?? gapsByConcept.get(conceptID)?.[0]?.artifact_evidence
    ?? [];
}

function buildConcepts(input: {
  artifactSession: ArtifactSession;
  states: ConceptUnderstandingState[];
  gaps: LearningGap[];
  challenges: PracticeChallenge[];
  reviews: UnderstandingMemoryReview[];
  referenceTime: string;
}): UnderstandingMemoryConcept[] {
  const graphNodes = input.artifactSession.concept_graph?.nodes ?? [];
  const graphEvidence = new Map(graphNodes.map((node) => [node.id, node.evidence]));
  const labels = new Map(graphNodes.map((node) => [node.id, node.label]));
  const conceptIDs = new Set(graphNodes.map((node) => node.id));
  const statesByConcept = new Map(input.states.map((state) => [state.concept_id, state]));
  const gapsByConcept = groupByConcept(input.gaps);
  const challengesByConcept = groupByConcept(input.challenges);
  for (const state of input.states) conceptIDs.add(state.concept_id);
  for (const gap of input.gaps) conceptIDs.add(gap.concept_id);
  for (const challenge of input.challenges) conceptIDs.add(challenge.concept_id);

  return [...conceptIDs].sort().map((conceptID) => {
    const state = statesByConcept.get(conceptID);
    const gaps = gapsByConcept.get(conceptID) ?? [];
    const challenges = challengesByConcept.get(conceptID) ?? [];
    const nextReviewAt = minTimestamp(input.reviews
      .filter((review) => review.concept_id === conceptID)
      .map((review) => review.next_review_at));
    const hasDueReview = Boolean(nextReviewAt && nextReviewAt <= input.referenceTime);
    const status = gaps.length > 0
      ? "gap_open"
      : state && hasDueReview
        ? "needs_review"
        : state
          ? "confirmed"
          : "unseen";

    return {
      concept_id: conceptID,
      concept_label: state?.concept_label ?? gaps[0]?.concept_label ?? labels.get(conceptID) ?? conceptID,
      status,
      confidence: state?.confidence ?? gaps[0]?.confidence,
      expected_layer: state?.expected_layer ?? gaps[0]?.expected_layer,
      observed_layer: state?.observed_layer ?? gaps[0]?.observed_layer,
      evidence: conceptEvidence(conceptID, graphEvidence, statesByConcept, gapsByConcept),
      last_answered_at: state?.updated_at ?? gaps[0]?.created_at,
      next_review_at: nextReviewAt,
      open_gap_ids: gaps.map((gap) => gap.id),
      challenge_ids: challenges.map((challenge) => challenge.id),
    };
  });
}

export function buildUnderstandingMemory(artifactSession: ArtifactSession, referenceTime: string): UnderstandingMemory {
  const states = Object.values(artifactSession.concept_states ?? {});
  const gaps = [...(artifactSession.learning_gaps ?? [])];
  const challenges = [...(artifactSession.practice_challenges ?? [])];
  const gapByID = new Map(gaps.map((gap) => [gap.id, gap]));
  const challengedGapIDs = new Set(challenges
    .filter((challenge) => challenge.completion_state === "pending")
    .map((challenge) => challenge.gap_id));
  const reviews = sortedReviews([
    ...challenges
      .filter((challenge) => challenge.completion_state === "pending")
      .map((challenge) => challengeReview(challenge, gapByID)),
    ...states.map(confirmedReview),
    ...gaps.filter((gap) => !challengedGapIDs.has(gap.id)).map(gapReview),
  ]);
  const answerHistory = [...answersFromGaps(gaps), ...answersFromStates(states)]
    .sort((left, right) => left.created_at.localeCompare(right.created_at));

  return {
    artifact_session_id: artifactSession.artifact_session_id,
    label: artifactSession.label,
    root_path: artifactSession.root_path,
    generated_at: now(),
    concept_states: buildConcepts({ artifactSession, states, gaps, challenges, reviews, referenceTime }),
    answer_history: answerHistory,
    gaps,
    challenges,
    next_reviews: reviews,
  };
}

export function getUnderstandingMemoryCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session_id: string;
  understanding_memory: UnderstandingMemory;
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const referenceTime = typeof payload.reference_time === "string" ? payload.reference_time : now();
  return {
    ok: true,
    data: {
      artifact_session_id: artifactSession.artifact_session_id,
      understanding_memory: buildUnderstandingMemory(artifactSession, referenceTime),
      operation_state: toOperationState("Understanding memory loaded from persisted artifact session state."),
    },
  };
}
