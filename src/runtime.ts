import { randomUUID } from "node:crypto";
import { basename } from "node:path";

import {
  Layer,
  verifyAnswer,
  type AgentWorkSessionSummary,
  type AnswerQuality,
  type DeclaredWorkIntent,
  type LearningSignal,
  type TaskType,
} from "./pedagogy/index.ts";
import { recordSignal } from "./store.ts";
import { CodeSelectionError, readCodeSelection, type RuntimeCodeSelection } from "./code-selection.ts";
import {
  assertArtifactAllowsPath,
  createArtifactSessionCommand,
  getArtifactSessionCommand,
  resolveArtifactSessionFromPayload,
} from "./runtime-artifact-session.ts";
import { runProjectLearningAgentCommand } from "./runtime-agent.ts";
import { prepareAutopsyStepCommand } from "./runtime-autopsy.ts";
import { buildConceptGraphCommand } from "./runtime-concept-graph.ts";
import { detectLearningGapFromAnswer, persistGapDetectionResult } from "./runtime-gap-detection.ts";
import { getUnderstandingMemoryCommand } from "./runtime-memory.ts";
import { generatePracticeChallengesCommand } from "./runtime-practice.ts";
import { createPreparedQuestionSession } from "./runtime-prepared-question.ts";
import { generateQuestionsCommand } from "./runtime-questions.ts";
import { readinessReportCommand } from "./runtime-readiness.ts";
import { getSession, readState, toSummary, writeState } from "./runtime-state.ts";
import { getStudyPanelStateCommand } from "./runtime-study-panel.ts";
import {
  startWorkspaceSessionCommand,
  submitWorkspaceAttemptCommand,
} from "./runtime-workspace-session.ts";
import {
  RuntimeError,
  excerptPrefix,
  fail,
  now,
  toOperationState,
  type ConceptUnderstandingState,
  type LearningGap,
  type RuntimeQuestion,
  type RuntimeRequest,
  type RuntimeResponse,
  type RuntimeSuccess,
} from "./runtime-support.ts";

function inferTaskType(desiredHelp: string): TaskType {
  switch (desiredHelp) {
    case "explain_system":
      return "review-architecture";
    case "find_gaps":
      return "design-boundary";
    case "prepare_study_plan":
      return "read-and-understand";
    case "generate_questions":
    default:
      return "make-small-change";
  }
}

function inferConcept(intent: DeclaredWorkIntent): string {
  return intent.expected_work_area?.trim() || intent.project_label || "system";
}

function asLayer(value: number): typeof Layer[keyof typeof Layer] {
  if (value <= 1) return Layer.L1_SURFACE_RECOGNITION;
  if (value === 2) return Layer.L2_ISOLATED_EXPLANATION;
  if (value === 3) return Layer.L3_CONTEXTUAL_CONNECTION;
  if (value === 4) return Layer.L4_APPLIED_REASONING;
  return Layer.L5_FLUENT_OWNERSHIP;
}

function confidenceForQuality(answerQuality: AnswerQuality): "low" | "medium" | "high" {
  switch (answerQuality) {
    case "verified":
      return "high";
    case "partial":
      return "medium";
    case "gap_confirmed":
    case "uncertainty_declared":
      return "low";
  }
}

function assessAnswerQuality(answer: string): AnswerQuality {
  const normalized = answer.trim().toLowerCase();
  if (!normalized || normalized.length < 16 || /no se|no sé|not sure|i don't know/.test(normalized)) {
    return "uncertainty_declared";
  }
  if (/risk|boundary|depends|because|flow|contract|owner/.test(normalized) && normalized.length > 80) {
    return "verified";
  }
  if (normalized.length > 32) {
    return "partial";
  }
  return "gap_confirmed";
}

function declareIntent(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  declared_intent: DeclaredWorkIntent;
  operation_state: { message: string };
}> {
  const projectLabel = String(payload.project_label || "demo-project").trim();
  const statement = String(payload.statement || "").trim();
  const uncertainty = String(payload.uncertainty || "").trim();
  if (!statement || !uncertainty) {
    fail("invalid_payload", "declare_intent requires statement and uncertainty.");
  }

  const state = readState();
  const sessionID = randomUUID();
  const intent: DeclaredWorkIntent = {
    intent_id: randomUUID(),
    created_at: now(),
    project_label: projectLabel,
    project_path: typeof payload.project_path === "string" ? payload.project_path : null,
    statement,
    uncertainty,
    expected_work_area: typeof payload.expected_work_area === "string" ? payload.expected_work_area : null,
    desired_help: (payload.desired_help as DeclaredWorkIntent["desired_help"]) || "generate_questions",
  };

  const signal: LearningSignal = {
    signal_id: randomUUID(),
    created_at: now(),
    source: "user_declared_intent",
    project_label: projectLabel,
    project_path: intent.project_path,
    concept_or_area: inferConcept(intent),
    reason: "User declared uncertainty for the current work.",
    evidence: [statement, uncertainty],
    severity: "important",
    confidence: "high",
  };

  recordSignal({
    signal_id: signal.signal_id,
    session_id: sessionID,
    concept: signal.concept_or_area,
    source: signal.source,
    evidence: signal.evidence.join(" | "),
    confidence: signal.confidence,
    observed_at: signal.created_at,
  });

  state.sessions[sessionID] = {
    session_id: sessionID,
    project_label: projectLabel,
    started_at: now(),
    ended_at: null,
    declared_intent: intent,
    observed_tools: ["typescript-runtime"],
    learning_signals: [signal],
    ownership_questions: [],
    export_state: "not_exported",
    task_type: inferTaskType(intent.desired_help),
  };
  state.current_session_id = sessionID;
  writeState(state);

  return {
    ok: true,
    data: {
      session_id: sessionID,
      declared_intent: intent,
      operation_state: toOperationState("Intent declared in TypeScript runtime."),
    },
  };
}

function prepareCodeQuestionCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  selection: RuntimeCodeSelection;
  question: RuntimeQuestion;
  operation_state: { message: string };
}> {
  const projectLabel = String(payload.project_label || "").trim() || "code";
  const artifactSession = resolveArtifactSessionFromPayload(payload);
  const boundedFilePath = artifactSession
    ? assertArtifactAllowsPath(String(payload.file_path || ""), artifactSession)
    : String(payload.file_path || "");
  const selection = readCodeSelection({
    project_path: artifactSession?.root_path ?? (typeof payload.project_path === "string" ? payload.project_path : null),
    file_path: boundedFilePath,
    start_line: Number(payload.start_line),
    end_line: payload.end_line == null ? null : Number(payload.end_line),
  });
  const fileName = basename(selection.file_path);
  const lineLabel = selection.start_line === selection.end_line
    ? `${selection.start_line}`
    : `${selection.start_line}-${selection.end_line}`;
  const targetArea = fileName || "selected code";
  const questionPrompt = `Before I explain anything: looking at ${fileName}:${lineLabel}, what responsibility do you think this fragment has, and what could break if that responsibility changes?`;
  const evidence = [
    `file_path=${selection.file_path}`,
    `line_range=${selection.start_line}-${selection.end_line}`,
    `excerpt=${excerptPrefix(selection.selected_text)}`,
  ];
  const { session, question } = createPreparedQuestionSession({
    projectLabel,
    projectPath: selection.project_path ?? null,
    observedTools: ["typescript-runtime", "code-range-selection"],
    intentStatement: `Understand selected code in ${fileName}:${lineLabel}.`,
    intentUncertainty: "User is building a mental model of the selected code before receiving an explanation.",
    expectedWorkArea: targetArea,
    question: {
      prompt: questionPrompt,
      target_area: targetArea,
      why_it_matters: "Owning this code means being able to name its responsibility and reason about the risk of changing it.",
      evidence_basis: evidence,
      answer_style: selection.start_line === selection.end_line ? "short_explanation" : "risk_analysis",
      max_followups: 1,
    },
    signalReason: "Runtime prepared a Socratic ownership question for a bounded code selection.",
    signalEvidence: evidence,
    codeSelection: selection,
  });

  return {
    ok: true,
    data: {
      session_id: session.session_id,
      selection,
      question,
      operation_state: toOperationState("Code question prepared."),
    },
  };
}

function answerQuestionCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  question: RuntimeQuestion;
  learning_gap?: LearningGap;
  confirmed_concept_state?: ConceptUnderstandingState;
  session_summary: AgentWorkSessionSummary;
  operation_state: { message: string };
}> {
  const state = readState();
  const session = getSession(state, payload.session_id as string | undefined);
  const questionID = String(payload.question_id || "");
  const answer = String(payload.answer || "").trim();
  if (!questionID || !answer) {
    fail("invalid_payload", "answer_question requires question_id and answer.");
  }

  const question = session.ownership_questions.find((entry) => entry.question_id === questionID);
  if (!question) {
    fail("missing_question", `Question ${questionID} was not found.`);
  }

  const quality = (payload.answer_quality as AnswerQuality | undefined) || assessAnswerQuality(answer);
  const verification = verifyAnswer(asLayer(question.detected_layer), asLayer(question.required_layer), quality);
  question.answer = answer;
  question.answer_quality = quality;
  const gapResult = detectLearningGapFromAnswer({ state, session, question, answer, quality });
  persistGapDetectionResult(state, gapResult);

  const intent = session.declared_intent;
  const concept = question.target_area;
  const createdAt = now();
  const signal: LearningSignal = {
    signal_id: randomUUID(),
    created_at: createdAt,
    source: "ownership_question",
    project_label: session.project_label,
    project_path: intent?.project_path ?? null,
    concept_or_area: concept,
    reason: verification.action.message,
    evidence: [question.prompt, answer],
    severity: quality === "verified" ? "later" : "important",
    confidence: confidenceForQuality(quality),
  };

  session.learning_signals.push(signal);
  session.ended_at = createdAt;
  session.export_state = "ready_for_review";

  recordSignal({
    signal_id: signal.signal_id,
    session_id: session.session_id,
    concept,
    source: signal.source,
    evidence: signal.evidence.join(" | "),
    confidence: signal.confidence,
    observed_at: signal.created_at,
  });

  writeState(state);

  return {
    ok: true,
    data: {
      session_id: session.session_id,
      question,
      ...(gapResult.kind === "gap"
        ? { learning_gap: gapResult.learning_gap }
        : { confirmed_concept_state: gapResult.confirmed_concept_state }),
      session_summary: toSummary(session),
      operation_state: toOperationState(verification.action.message),
    },
  };
}

function getSessionSummaryCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_summary: AgentWorkSessionSummary;
  operation_state: { message: string };
}> {
  const state = readState();
  const session = getSession(state, payload.session_id as string | undefined);
  return {
    ok: true,
    data: {
      session_summary: toSummary(session),
      operation_state: toOperationState("Session summary loaded from TypeScript runtime."),
    },
  };
}

export function handleRequest(request: RuntimeRequest): RuntimeResponse<unknown> {
  try {
    switch (request.command) {
      case "create_artifact_session":
        return createArtifactSessionCommand(request.payload);
      case "get_artifact_session":
        return getArtifactSessionCommand(request.payload);
      case "build_concept_graph":
        return buildConceptGraphCommand(request.payload);
      case "prepare_autopsy_step":
        return prepareAutopsyStepCommand(request.payload);
      case "get_understanding_memory":
        return getUnderstandingMemoryCommand(request.payload);
      case "readiness_report":
        return readinessReportCommand(request.payload);
      case "get_study_panel_state":
        return getStudyPanelStateCommand(request.payload);
      case "start_workspace_session":
        return startWorkspaceSessionCommand(request.payload);
      case "submit_workspace_attempt":
        return submitWorkspaceAttemptCommand(request.payload);
      case "generate_practice_challenges":
        return generatePracticeChallengesCommand(request.payload);
      case "run_project_learning_agent":
        return runProjectLearningAgentCommand(request.payload);
      case "declare_intent":
        return declareIntent(request.payload);
      case "generate_questions":
        return generateQuestionsCommand(request.payload);
      case "answer_question":
        return answerQuestionCommand(request.payload);
      case "prepare_code_question":
        return prepareCodeQuestionCommand(request.payload);
      case "get_session_summary":
        return getSessionSummaryCommand(request.payload);
    }
  } catch (error) {
    if (error instanceof CodeSelectionError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    if (error instanceof RuntimeError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    return {
      ok: false,
      error: {
        code: "runtime_error",
        message: error instanceof Error ? error.message : "Unknown runtime error",
      },
    };
  }
}

async function readSTDIN(): Promise<string> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8").trim();
}

export async function runFromSTDIO(): Promise<void> {
  const raw = await readSTDIN();
  const request = JSON.parse(raw || "{}") as RuntimeRequest;
  process.stdout.write(JSON.stringify(handleRequest(request)));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  await runFromSTDIO();
}
