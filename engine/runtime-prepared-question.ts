import { randomUUID } from "node:crypto";

import { Layer, type DeclaredWorkIntent, type LearningSignal } from "./pedagogy/index.ts";
import { recordSignal } from "./store.ts";
import type { RuntimeCodeSelection } from "./code-selection.ts";
import { readState, writeState } from "./runtime-state.ts";
import { now, type RuntimeQuestion, type RuntimeSession, type RuntimeState } from "./runtime-support.ts";

export function createPreparedQuestionSession(input: {
  projectLabel: string;
  projectPath?: string | null;
  observedTools: string[];
  intentStatement: string;
  intentUncertainty: string;
  expectedWorkArea: string;
  question: Omit<RuntimeQuestion, "question_id" | "created_at" | "session_id" | "detected_layer" | "required_layer">;
  signalReason: string;
  signalEvidence: string[];
  codeSelection?: RuntimeCodeSelection;
}): { state: RuntimeState; session: RuntimeSession; question: RuntimeQuestion } {
  const state = readState();
  const sessionID = randomUUID();
  const createdAt = now();
  const intent: DeclaredWorkIntent = {
    intent_id: randomUUID(),
    created_at: createdAt,
    project_label: input.projectLabel,
    project_path: input.projectPath ?? null,
    statement: input.intentStatement,
    uncertainty: input.intentUncertainty,
    expected_work_area: input.expectedWorkArea,
    desired_help: "generate_questions",
  };
  const question: RuntimeQuestion = {
    question_id: randomUUID(),
    created_at: createdAt,
    session_id: sessionID,
    detected_layer: Layer.L1_SURFACE_RECOGNITION,
    required_layer: Layer.L4_APPLIED_REASONING,
    ...input.question,
  };
  const signal: LearningSignal = {
    signal_id: randomUUID(),
    created_at: createdAt,
    source: "ownership_question",
    project_label: input.projectLabel,
    project_path: input.projectPath ?? null,
    concept_or_area: input.expectedWorkArea,
    reason: input.signalReason,
    evidence: input.signalEvidence,
    severity: "important",
    confidence: "high",
  };

  const session: RuntimeSession = {
    session_id: sessionID,
    project_label: input.projectLabel,
    started_at: createdAt,
    ended_at: null,
    declared_intent: intent,
    observed_tools: input.observedTools,
    learning_signals: [signal],
    ownership_questions: [question],
    export_state: "ready_for_review",
    task_type: "make-small-change",
    code_selection: input.codeSelection,
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
  writeState(state);
  return { state, session, question };
}
