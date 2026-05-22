import { randomUUID } from "node:crypto";
import { join } from "node:path";

import { readState, writeState } from "../../runtime-state.ts";
import type { AutopsyStep, ConceptGraph, EvidenceCitation, RuntimeQuestion, RuntimeSession } from "../../runtime-support.ts";
import { classifyLayer } from "./classifier.ts";
import type { EvalCase } from "./types.ts";

export function seedRuntimeState(input: {
  testCase: EvalCase;
  artifactSessionID: string;
  root: string;
  evidence: EvidenceCitation[];
}): { sessionID: string; questionID: string } {
  const state = readState();
  const sessionID = randomUUID();
  const questionID = randomUUID();
  const createdAt = new Date().toISOString();
  const question: RuntimeQuestion = {
    question_id: questionID,
    created_at: createdAt,
    session_id: sessionID,
    prompt: `Explain ${input.testCase.concept_under_test.label}.`,
    target_area: input.testCase.concept_under_test.label,
    why_it_matters: input.testCase.learning_goal,
    evidence_basis: input.evidence.map((entry) => `${entry.file_path}:${entry.start_line}-${entry.end_line}`),
    answer_style: "risk_analysis",
    detected_layer: Math.max(1, classifyLayer(input.testCase)),
    required_layer: input.testCase.concept_under_test.layer_target,
    max_followups: 1,
  };
  const session: RuntimeSession = {
    session_id: sessionID,
    project_label: input.testCase.title,
    started_at: createdAt,
    ended_at: null,
    declared_intent: {
      intent_id: randomUUID(),
      created_at: createdAt,
      project_label: input.testCase.title,
      project_path: input.root,
      statement: input.testCase.learning_goal,
      uncertainty: "Eval fixture answer.",
      expected_work_area: input.testCase.concept_under_test.label,
      desired_help: "generate_questions",
    },
    observed_tools: ["deterministic-eval"],
    learning_signals: [],
    ownership_questions: [question],
    export_state: "ready_for_review",
    task_type: "make-small-change",
  };
  const graph: ConceptGraph = {
    artifact_session_id: input.artifactSessionID,
    generated_at: createdAt,
    scope: {
      root_path: input.root,
      included_paths: input.testCase.artifact_boundary.included_paths.map((entry) => join(input.root, entry)),
      excluded_paths: input.testCase.artifact_boundary.excluded_paths
        .filter((entry) => !entry.startsWith("../"))
        .map((entry) => join(input.root, entry)),
    },
    nodes: [{
      id: input.testCase.concept_under_test.id,
      label: input.testCase.concept_under_test.label,
      kind: "runtime",
      source_paths: input.evidence.map((entry) => entry.file_path),
      why_it_matters: input.testCase.learning_goal,
      prerequisite_concepts: [],
      evidence: input.evidence,
    }],
    edges: [],
  };
  const step: AutopsyStep = {
    autopsy_step_id: randomUUID(),
    artifact_session_id: input.artifactSessionID,
    session_id: sessionID,
    question_id: questionID,
    target_type: "concept",
    selected_id: input.testCase.concept_under_test.id,
    concept_id: input.testCase.concept_under_test.id,
    prompt: question.prompt,
    bounded_evidence: input.evidence,
    evidence_basis: question.evidence_basis,
    next_action: "collect_user_attempt",
    created_at: createdAt,
  };
  const artifactSession = state.artifact_sessions?.[input.artifactSessionID];
  if (!artifactSession) throw new Error(`Missing artifact session ${input.artifactSessionID}`);
  artifactSession.concept_graph = graph;
  artifactSession.active_autopsy_step = step;
  state.sessions[sessionID] = session;
  state.current_session_id = sessionID;
  writeState(state);
  return { sessionID, questionID };
}
