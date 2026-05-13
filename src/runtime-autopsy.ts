import { randomUUID } from "node:crypto";
import { basename } from "node:path";

import { createPreparedQuestionSession } from "./runtime-prepared-question.ts";
import { getArtifactSession, readState, writeState } from "./runtime-state.ts";
import {
  excerptPrefix,
  fail,
  now,
  toOperationState,
  type AutopsyStep,
  type AutopsyTargetType,
  type ConceptEdge,
  type ConceptGraph,
  type ConceptNode,
  type EvidenceCitation,
  type RuntimeSuccess,
} from "./runtime-support.ts";

const MAX_AUTOPSY_EVIDENCE = 3;

type ResolvedAutopsyTarget = {
  type: AutopsyTargetType;
  id: string;
  label: string;
  conceptID?: string;
  edgeID?: string;
  evidence: EvidenceCitation[];
  prompt: string;
};

function citationLabel(citation: EvidenceCitation): string {
  return `${basename(citation.file_path)}:${citation.start_line}-${citation.end_line} ${excerptPrefix(citation.excerpt, 120)}`;
}

function boundedEvidence(evidence: EvidenceCitation[]): EvidenceCitation[] {
  return evidence.slice(0, MAX_AUTOPSY_EVIDENCE);
}

function nodePrompt(node: ConceptNode): string {
  return [
    "Before any explanation, use the evidence below to predict what this concept is responsible for.",
    `Concept: ${node.label}.`,
    "Explain what you think it does and name one thing that could break if your model is wrong.",
  ].join(" ");
}

function edgePrompt(edge: ConceptEdge, graph: ConceptGraph): string {
  const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
  const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
  return [
    "Before any explanation, trace this flow using the evidence below.",
    `Flow: ${from} -> ${to}.`,
    "Predict why this connection exists and what state, data, or decision moves across it.",
  ].join(" ");
}

function findSelectedTarget(graph: ConceptGraph, payload: Record<string, unknown>): ResolvedAutopsyTarget {
  const conceptID = String(payload.concept_id || payload.selected_id || "").trim();
  if (conceptID) {
    const node = graph.nodes.find((entry) => entry.id === conceptID);
    if (node) {
      const evidence = boundedEvidence(node.evidence);
      return {
        type: "concept",
        id: node.id,
        label: node.label,
        conceptID: node.id,
        evidence,
        prompt: nodePrompt(node),
      };
    }
  }

  const edgeID = String(payload.edge_id || payload.flow_id || payload.selected_id || "").trim();
  if (edgeID) {
    const edge = graph.edges.find((entry) => entry.id === edgeID);
    if (edge) {
      const evidence = boundedEvidence(edge.evidence);
      return {
        type: "edge",
        id: edge.id,
        label: edge.label,
        edgeID: edge.id,
        evidence,
        prompt: edgePrompt(edge, graph),
      };
    }
  }

  const requested = conceptID || edgeID;
  fail(
    "missing_concept_or_edge",
    requested
      ? `Concept or edge ${requested} was not found in the persisted concept graph.`
      : "prepare_autopsy_step requires concept_id, edge_id, flow_id, or selected_id.",
  );
}

export function prepareAutopsyStepCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  artifact_session_id: string;
  autopsy_step: AutopsyStep;
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = getArtifactSession(state, payload.artifact_session_id as string | undefined);
  const graph = artifactSession.concept_graph;
  if (!graph) {
    fail("missing_concept_graph", "Build a concept graph for this artifact session before preparing an autopsy step.");
  }

  const target = findSelectedTarget(graph, payload);
  if (target.evidence.length === 0) {
    fail("missing_evidence", "Selected concept or edge has no evidence to support an autopsy step.");
  }

  const evidenceBasis = target.evidence.map(citationLabel);
  const { state: questionState, session, question } = createPreparedQuestionSession({
    projectLabel: artifactSession.label,
    projectPath: artifactSession.root_path,
    observedTools: ["typescript-runtime", "artifact-concept-graph", "autopsy-step"],
    intentStatement: `Attempt an autopsy step for ${target.type} ${target.id}.`,
    intentUncertainty: "User must predict or trace the artifact evidence before receiving an explanation.",
    expectedWorkArea: target.label,
    question: {
      prompt: target.prompt,
      target_area: target.label,
      why_it_matters: "The user should expose their current mental model before Sibi compares it to artifact evidence.",
      evidence_basis: evidenceBasis,
      answer_style: target.type === "edge" ? "system_walkthrough" : "short_explanation",
      max_followups: 1,
    },
    signalReason: "Runtime prepared an attempt-first autopsy step from persisted concept graph evidence.",
    signalEvidence: evidenceBasis,
  });

  const activeArtifactSession = getArtifactSession(questionState, artifactSession.artifact_session_id);
  const step: AutopsyStep = {
    autopsy_step_id: randomUUID(),
    artifact_session_id: activeArtifactSession.artifact_session_id,
    session_id: session.session_id,
    question_id: question.question_id,
    target_type: target.type,
    selected_id: target.id,
    concept_id: target.conceptID,
    edge_id: target.edgeID,
    prompt: target.prompt,
    bounded_evidence: target.evidence,
    evidence_basis: evidenceBasis,
    next_action: "collect_user_attempt",
    created_at: now(),
  };

  activeArtifactSession.active_autopsy_step = step;
  writeState(questionState);

  return {
    ok: true,
    data: {
      artifact_session_id: activeArtifactSession.artifact_session_id,
      autopsy_step: step,
      operation_state: toOperationState("Autopsy step prepared. Collect the user's attempt before explaining."),
    },
  };
}
