import { randomUUID } from "node:crypto";

import type { AnswerQuality } from "../pedagogy/index.ts";
import {
  now,
  type ArtifactSession,
  type ConceptEdge,
  type ConceptGraph,
  type ConceptUnderstandingState,
  type EvidenceCitation,
  type LearningGap,
  type LearningGapConfidence,
  type LearningGapSeverity,
  type RuntimeQuestion,
  type RuntimeSession,
  type RuntimeState,
} from "../runtime/contracts.ts";

type ArtifactAnswerContext = {
  artifactSession: ArtifactSession;
  conceptID: string;
  conceptLabel: string;
  evidence: EvidenceCitation[];
};

export type GapDetectionResult =
  | { kind: "gap"; learning_gap: LearningGap; confirmed_concept_state?: never }
  | { kind: "confirmed"; learning_gap?: never; confirmed_concept_state: ConceptUnderstandingState };

function slug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "unknown-concept";
}

function edgeLabel(edge: ConceptEdge, graph: ConceptGraph): string {
  const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
  const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
  return `${from} -> ${to}`;
}

function fallbackEvidence(question: RuntimeQuestion): EvidenceCitation[] {
  return question.evidence_basis.slice(0, 3).map((entry, index) => ({
    file_path: "question_evidence",
    start_line: index + 1,
    end_line: index + 1,
    excerpt: entry,
  }));
}

function findArtifactAnswerContext(
  state: RuntimeState,
  session: RuntimeSession,
  question: RuntimeQuestion,
): ArtifactAnswerContext | null {
  const artifactSessions = Object.values(state.artifact_sessions ?? {});

  for (const artifactSession of artifactSessions) {
    const step = artifactSession.active_autopsy_step;
    if (step && (step.question_id === question.question_id || step.session_id === session.session_id)) {
      return {
        artifactSession,
        conceptID: step.concept_id ?? step.edge_id ?? step.selected_id,
        conceptLabel: question.target_area,
        evidence: step.bounded_evidence,
      };
    }
  }

  for (const artifactSession of artifactSessions) {
    const graph = artifactSession.concept_graph;
    if (!graph) continue;

    const node = graph.nodes.find((entry) => entry.label === question.target_area || entry.id === question.target_area);
    if (node) {
      return {
        artifactSession,
        conceptID: node.id,
        conceptLabel: node.label,
        evidence: node.evidence,
      };
    }

    const edge = graph.edges.find((entry) => edgeLabel(entry, graph) === question.target_area || entry.id === question.target_area);
    if (edge) {
      return {
        artifactSession,
        conceptID: edge.id,
        conceptLabel: edgeLabel(edge, graph),
        evidence: edge.evidence,
      };
    }
  }

  return null;
}

function observedLayer(question: RuntimeQuestion, quality: AnswerQuality): number {
  switch (quality) {
    case "verified":
      return Math.max(question.detected_layer, question.required_layer);
    case "partial":
      return Math.max(1, Math.min(question.detected_layer, question.required_layer - 1));
    case "uncertainty_declared":
      return Math.max(1, question.detected_layer);
    case "gap_confirmed":
      return Math.max(1, question.detected_layer);
  }
}

function severityFor(question: RuntimeQuestion, quality: AnswerQuality, observed: number): LearningGapSeverity {
  if (quality === "uncertainty_declared") return "important";
  if (quality === "partial") return "important";
  if (quality === "gap_confirmed") return "critical";
  return "later";
}

function confidenceFor(quality: AnswerQuality): LearningGapConfidence {
  switch (quality) {
    case "verified":
      return "high";
    case "partial":
      return "medium";
    case "gap_confirmed":
      return "high";
    case "uncertainty_declared":
      return "medium";
  }
}

function misconceptionFor(quality: AnswerQuality, conceptLabel: string): string {
  switch (quality) {
    case "partial":
      return `The answer may explain ${conceptLabel} in isolation but does not yet connect it to the cited artifact evidence, boundary, or change risk.`;
    case "gap_confirmed":
      return `The answer likely maps ${conceptLabel} to the wrong responsibility or ignores the behavior shown by the artifact evidence.`;
    case "uncertainty_declared":
      return `The user explicitly declared uncertainty about ${conceptLabel}; no misconception is assumed beyond the missing mental model.`;
    case "verified":
      return "No misconception detected from this answer.";
  }
}

function repairActionFor(quality: AnswerQuality, conceptLabel: string): string {
  switch (quality) {
    case "partial":
      return `Ask the user to trace ${conceptLabel} from one cited line to the nearest boundary or downstream effect.`;
    case "gap_confirmed":
      return `Return to the cited artifact evidence and have the user restate ${conceptLabel}'s responsibility before answering a narrower follow-up.`;
    case "uncertainty_declared":
      return `Offer a smaller orientation prompt for ${conceptLabel} using the same citations before asking for prediction.`;
    case "verified":
      return `Keep ${conceptLabel} available for later spaced review; do not claim full readiness from one answer.`;
  }
}

export function detectLearningGapFromAnswer(input: {
  state: RuntimeState;
  session: RuntimeSession;
  question: RuntimeQuestion;
  answer: string;
  quality: AnswerQuality;
}): GapDetectionResult {
  const artifactContext = findArtifactAnswerContext(input.state, input.session, input.question);
  const conceptLabel = artifactContext?.conceptLabel ?? input.question.target_area;
  const conceptID = artifactContext?.conceptID ?? slug(conceptLabel);
  const artifactEvidence = (artifactContext?.evidence.length ? artifactContext.evidence : fallbackEvidence(input.question)).slice(0, 3);
  const answerEvidence = [`prompt=${input.question.prompt}`, `answer=${input.answer}`];
  const observed = observedLayer(input.question, input.quality);
  const createdAt = now();

  if (input.quality === "verified") {
    return {
      kind: "confirmed",
      confirmed_concept_state: {
        concept_id: conceptID,
        concept_label: conceptLabel,
        session_id: input.session.session_id,
        question_id: input.question.question_id,
        status: "confirmed",
        expected_layer: input.question.required_layer,
        observed_layer: observed,
        confidence: "high",
        evidence: artifactEvidence,
        answer_evidence: answerEvidence,
        repair_action: repairActionFor(input.quality, conceptLabel),
        updated_at: createdAt,
      },
    };
  }

  return {
    kind: "gap",
    learning_gap: {
      id: randomUUID(),
      artifact_session_id: artifactContext?.artifactSession.artifact_session_id,
      session_id: input.session.session_id,
      question_id: input.question.question_id,
      concept_id: conceptID,
      concept_label: conceptLabel,
      expected_layer: input.question.required_layer,
      observed_layer: observed,
      observed_answer_or_uncertainty: input.answer,
      artifact_evidence: artifactEvidence,
      answer_evidence: answerEvidence,
      suspected_misconception: misconceptionFor(input.quality, conceptLabel),
      severity: severityFor(input.question, input.quality, observed),
      confidence: confidenceFor(input.quality),
      repair_action: repairActionFor(input.quality, conceptLabel),
      created_at: createdAt,
    },
  };
}

export function persistGapDetectionResult(state: RuntimeState, result: GapDetectionResult): void {
  if (result.kind === "gap") {
    const artifactSessionID = result.learning_gap.artifact_session_id;
    if (artifactSessionID && state.artifact_sessions?.[artifactSessionID]) {
      const artifactSession = state.artifact_sessions[artifactSessionID];
      artifactSession.learning_gaps = [...(artifactSession.learning_gaps ?? []), result.learning_gap];
    }
    return;
  }

  const artifactSession = Object.values(state.artifact_sessions ?? {}).find((candidate) => {
    const step = candidate.active_autopsy_step;
    return step?.question_id === result.confirmed_concept_state.question_id
      || step?.session_id === result.confirmed_concept_state.session_id;
  }) ?? Object.values(state.artifact_sessions ?? {}).find((candidate) => {
    const graph = candidate.concept_graph;
    return Boolean(graph?.nodes.some((node) => node.id === result.confirmed_concept_state.concept_id));
  });

  if (artifactSession) {
    artifactSession.concept_states = {
      ...(artifactSession.concept_states ?? {}),
      [result.confirmed_concept_state.concept_id]: result.confirmed_concept_state,
    };
  }
}
