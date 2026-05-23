import { randomUUID } from "node:crypto";
import { basename } from "node:path";

import {
  Layer,
  MINIMUM_LAYER_FOR_TASK,
  generateQuestions,
  type DeclaredWorkIntent,
  type DetectedGap,
  type LearningSignal,
} from "../pedagogy/index.ts";
import { getConceptMap, recordSignal } from "../persistence/signal-store.ts";
import { getArtifactSession, getSession, readState, writeState } from "../persistence/state.ts";
import {
  excerptPrefix,
  fail,
  now,
  toOperationState,
  type ArtifactSession,
  type AutopsyStep,
  type ConceptEdge,
  type ConceptGraph,
  type EvidenceCitation,
  type RuntimeQuestion,
  type RuntimeSession,
  type RuntimeState,
  type RuntimeSuccess,
} from "../runtime/contracts.ts";

const MAX_IMMEDIATE_QUESTIONS = 3;
const MAX_EVIDENCE_ITEMS = 3;

function inferConcept(intent: DeclaredWorkIntent): string {
  return intent.expected_work_area?.trim() || intent.project_label || "system";
}

function evidenceLabel(citation: EvidenceCitation): string {
  return `${basename(citation.file_path)}:${citation.start_line}-${citation.end_line} ${excerptPrefix(citation.excerpt, 120)}`;
}

function boundedEvidenceBasis(evidence: string[]): string[] {
  return evidence.map((entry) => entry.trim()).filter(Boolean).slice(0, MAX_EVIDENCE_ITEMS);
}

function validateQuestion(question: RuntimeQuestion): RuntimeQuestion {
  const evidenceBasis = boundedEvidenceBasis(question.evidence_basis);
  if (
    !question.target_area.trim()
    || !question.why_it_matters.trim()
    || !question.answer_style
    || evidenceBasis.length === 0
  ) {
    fail("invalid_question_policy", "Ownership questions require target area, why it matters, answer style, and evidence basis.");
  }

  return {
    ...question,
    evidence_basis: evidenceBasis,
    max_followups: Math.max(0, Math.min(question.max_followups ?? 1, 2)),
  };
}

function artifactQuestionPrompt(targetLabel: string, targetType: "concept" | "edge"): string {
  if (targetType === "edge") {
    return [
      "Before any explanation, can you walk me through this artifact flow using the cited evidence?",
      `Target: ${targetLabel}.`,
      "Name what moves across the boundary and one risk if that model is wrong.",
    ].join(" ");
  }

  return [
    "Before any explanation, can you explain what this artifact area is responsible for using the cited evidence?",
    `Target: ${targetLabel}.`,
    "Name one boundary or change risk that would prove you own the concept.",
  ].join(" ");
}

function findGraphTarget(graph: ConceptGraph, payload: Record<string, unknown>): {
  type: "concept" | "edge";
  id: string;
  label: string;
  evidence: EvidenceCitation[];
} {
  const selectedConceptID = String(payload.concept_id || payload.selected_id || "").trim();
  const concept = selectedConceptID
    ? graph.nodes.find((node) => node.id === selectedConceptID)
    : graph.nodes[0];
  if (concept) {
    return {
      type: "concept",
      id: concept.id,
      label: concept.label,
      evidence: concept.evidence.slice(0, MAX_EVIDENCE_ITEMS),
    };
  }

  const selectedEdgeID = String(payload.edge_id || payload.flow_id || payload.selected_id || "").trim();
  const edge = selectedEdgeID
    ? graph.edges.find((entry) => entry.id === selectedEdgeID)
    : graph.edges[0];
  if (edge) {
    return {
      type: "edge",
      id: edge.id,
      label: edgeLabel(edge, graph),
      evidence: edge.evidence.slice(0, MAX_EVIDENCE_ITEMS),
    };
  }

  fail("missing_concept_or_edge", "No concept or edge with evidence was found in the persisted concept graph.");
}

function edgeLabel(edge: ConceptEdge, graph: ConceptGraph): string {
  const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from;
  const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to;
  return `${from} -> ${to}`;
}

function normalizeStoredAutopsyQuestion(state: RuntimeState, step: AutopsyStep): RuntimeSession {
  const session = getSession(state, step.session_id);
  const question = session.ownership_questions.find((entry) => entry.question_id === step.question_id);
  if (!question) {
    fail("missing_question", `Question ${step.question_id} was not found for the active autopsy step.`);
  }

  const normalized = validateQuestion({
    ...question,
    evidence_basis: step.evidence_basis,
    max_followups: question.max_followups ?? 1,
  });
  session.ownership_questions = [normalized];
  session.export_state = "ready_for_review";
  return session;
}

function createGraphQuestionSession(
  state: RuntimeState,
  artifactSession: ArtifactSession,
  graph: ConceptGraph,
  payload: Record<string, unknown>,
): RuntimeSession {
  const target = findGraphTarget(graph, payload);
  if (target.evidence.length === 0) {
    fail("missing_evidence", "Selected concept or edge has no persisted artifact evidence for ownership questions.");
  }

  const evidenceBasis = target.evidence.map(evidenceLabel);
  const createdAt = now();
  const sessionID = randomUUID();
  const intent: DeclaredWorkIntent = {
    intent_id: randomUUID(),
    created_at: createdAt,
    project_label: artifactSession.label,
    project_path: artifactSession.root_path,
    statement: `Generate an evidence-backed ownership question for ${target.type} ${target.id}.`,
    uncertainty: "The question must use persisted artifact evidence instead of unbounded user text.",
    expected_work_area: target.label,
    desired_help: "generate_questions",
  };
  const question = validateQuestion({
    question_id: randomUUID(),
    created_at: createdAt,
    session_id: sessionID,
    prompt: artifactQuestionPrompt(target.label, target.type),
    target_area: target.label,
    why_it_matters: "This question checks whether the user can reason from bounded artifact evidence before receiving an explanation.",
    evidence_basis: evidenceBasis,
    answer_style: target.type === "edge" ? "system_walkthrough" : "boundary_explanation",
    detected_layer: Layer.L1_SURFACE_RECOGNITION,
    required_layer: Layer.L4_APPLIED_REASONING,
    max_followups: 1,
  });
  const signal: LearningSignal = {
    signal_id: randomUUID(),
    created_at: createdAt,
    source: "ownership_question",
    project_label: artifactSession.label,
    project_path: artifactSession.root_path,
    concept_or_area: target.label,
    reason: "Runtime generated a bounded ownership question from persisted concept graph evidence.",
    evidence: evidenceBasis,
    severity: "important",
    confidence: "high",
  };
  const session: RuntimeSession = {
    session_id: sessionID,
    project_label: artifactSession.label,
    started_at: createdAt,
    ended_at: null,
    declared_intent: intent,
    observed_tools: ["typescript-runtime", "artifact-concept-graph", "ownership-question-policy"],
    learning_signals: [signal],
    ownership_questions: [question],
    export_state: "ready_for_review",
    task_type: "make-small-change",
  };

  state.sessions[sessionID] = session;
  state.current_session_id = sessionID;
  recordSignal({
    signal_id: signal.signal_id,
    session_id: sessionID,
    concept: signal.concept_or_area,
    source: signal.source,
    evidence: signal.evidence.join(" | "),
    confidence: signal.confidence,
    observed_at: signal.created_at,
  });
  return session;
}

function generateFromArtifactContext(state: RuntimeState, artifactSession: ArtifactSession, payload: Record<string, unknown>): RuntimeSession {
  const requestedAutopsyID = String(payload.autopsy_step_id || "").trim();
  const step = artifactSession.active_autopsy_step;
  if (step && (!requestedAutopsyID || step.autopsy_step_id === requestedAutopsyID)) {
    return normalizeStoredAutopsyQuestion(state, step);
  }

  const graph = artifactSession.concept_graph;
  if (!graph) {
    fail("missing_concept_graph", "Build a concept graph before generating artifact-backed ownership questions.");
  }

  return createGraphQuestionSession(state, artifactSession, graph, payload);
}

function generateFromDeclaredIntent(state: RuntimeState, session: RuntimeSession): RuntimeSession {
  const intent = session.declared_intent;
  if (!intent) {
    fail("missing_intent", "Session has no declared intent.");
  }

  const concept = inferConcept(intent);
  const conceptMap = getConceptMap();
  const detectedLayer = conceptMap[concept]?.current_layer ?? Layer.L2_ISOLATED_EXPLANATION;
  const requiredLayer = MINIMUM_LAYER_FOR_TASK[session.task_type];
  const evidence = boundedEvidenceBasis([intent.statement, intent.uncertainty]);

  const gaps: DetectedGap[] = detectedLayer >= requiredLayer
    ? []
    : [{
      concept,
      detectedLayer,
      requiredLayer,
      severity: detectedLayer + 1 < requiredLayer ? "critical" : "important",
      confidence: "high",
      evidence,
      layerDetection: {
        concept,
        highestLayer: detectedLayer,
        observedSignals: [],
        averageConfidence: "high",
      },
    }];

  const generated = generateQuestions(gaps, session.session_id, MAX_IMMEDIATE_QUESTIONS)
    .slice(0, MAX_IMMEDIATE_QUESTIONS)
    .map(({ question }) => validateQuestion({
      ...question,
      detected_layer: detectedLayer,
      required_layer: requiredLayer,
      evidence_basis: evidence,
      max_followups: 1,
    }));

  const signal = gaps[0] ? questionSignal(session, intent, concept, gaps[0], evidence) : null;
  session.ownership_questions = generated;
  if (signal) {
    session.learning_signals.push(signal);
    recordSignal({
      signal_id: signal.signal_id,
      session_id: session.session_id,
      concept,
      source: signal.source,
      evidence: signal.evidence.join(" | "),
      confidence: signal.confidence,
      observed_at: signal.created_at,
    });
  }
  session.export_state = generated.length > 0 ? "ready_for_review" : session.export_state;
  return session;
}

function questionSignal(
  session: RuntimeSession,
  intent: DeclaredWorkIntent,
  concept: string,
  gap: DetectedGap,
  evidence: string[],
): LearningSignal {
  return {
    signal_id: randomUUID(),
    created_at: now(),
    source: "ownership_question",
    project_label: session.project_label,
    project_path: intent.project_path,
    concept_or_area: concept,
    reason: "Runtime generated a bounded question from declared user evidence.",
    evidence,
    severity: gap.severity,
    confidence: gap.confidence,
  };
}

export function generateQuestionsCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  questions: RuntimeQuestion[];
  learning_signals: LearningSignal[];
  operation_state: { message: string };
}> {
  const state = readState();
  const artifactSession = typeof payload.artifact_session_id === "string"
    ? getArtifactSession(state, payload.artifact_session_id)
    : null;
  const session = artifactSession
    ? generateFromArtifactContext(state, artifactSession, payload)
    : generateFromDeclaredIntent(state, getSession(state, payload.session_id as string | undefined));

  if (session.ownership_questions.length > MAX_IMMEDIATE_QUESTIONS) {
    fail("invalid_question_policy", "Ownership question policy allows at most three immediate questions.");
  }

  writeState(state);
  return {
    ok: true,
    data: {
      session_id: session.session_id,
      questions: session.ownership_questions,
      learning_signals: session.learning_signals,
      operation_state: toOperationState(
        session.ownership_questions.length > 0
          ? "Questions generated with bounded evidence policy."
          : "No gap detected for the current session.",
      ),
    },
  };
}
