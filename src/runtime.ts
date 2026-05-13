import { randomUUID } from "node:crypto";
import { basename } from "node:path";

import {
  Layer,
  MINIMUM_LAYER_FOR_TASK,
  generateQuestions,
  verifyAnswer,
  type AgentWorkSessionSummary,
  type AnswerQuality,
  type DeclaredWorkIntent,
  type DetectedGap,
  type LearningSignal,
  type TaskType,
} from "./pedagogy/index.ts";
import {
  appendNoteEvent,
  getActiveNote,
  getConceptMap,
  listNotes,
  recordSignal,
  saveResource,
  writeActiveNoteID,
  type Resource,
} from "./store.ts";
import { applyAppend, createNote, type AppendNoteInput, type Note, type NoteContext, type StartNoteInput } from "./notes.ts";
import { CodeSelectionError, readCodeSelection, type RuntimeCodeSelection } from "./code-selection.ts";
import { ReadingSelectionError, normalizeReadingSelection, type RuntimeReadingSelection } from "./reading-selection.ts";
import { createPreparedQuestionSession } from "./runtime-prepared-question.ts";
import { prepareCodeReviewCommand } from "./runtime-review-plan.ts";
import { getSession, readState, toSummary, writeState } from "./runtime-state.ts";
import {
  RuntimeError,
  excerptPrefix,
  fail,
  now,
  toOperationState,
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
    resource_ids: [],
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
  const selection = readCodeSelection({
    project_path: typeof payload.project_path === "string" ? payload.project_path : null,
    file_path: String(payload.file_path || ""),
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

function prepareReadingQuestionCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  selection: RuntimeReadingSelection;
  question: RuntimeQuestion;
  operation_state: { message: string };
}> {
  const projectLabel = String(payload.project_label || "").trim() || "reading";
  const originalSelectedText = String(payload.selected_text || "");
  const selection = normalizeReadingSelection({
    source_title: typeof payload.source_title === "string" ? payload.source_title : null,
    source_url: typeof payload.source_url === "string" ? payload.source_url : null,
    document_path: typeof payload.document_path === "string" ? payload.document_path : null,
    selected_text: originalSelectedText,
    user_note: typeof payload.user_note === "string" ? payload.user_note : null,
  });
  const sourceLabel = selection.source_title || selection.document_path || selection.source_url || "selected reading";
  const targetArea = selection.source_title || excerptPrefix(selection.selected_text, 48);
  const evidence = [
    `source=${sourceLabel}`,
    ...(selection.source_title ? [`source_title=${selection.source_title}`] : []),
    ...(selection.source_url ? [`source_url=${selection.source_url}`] : []),
    ...(selection.document_path ? [`document_path=${selection.document_path}`] : []),
    `excerpt=${excerptPrefix(selection.selected_text)}`,
    `original_selected_text=${originalSelectedText}`,
    ...(selection.user_note ? [`user_note=${selection.user_note}`] : []),
  ];
  const { session, question } = createPreparedQuestionSession({
    projectLabel,
    projectPath: null,
    observedTools: ["typescript-runtime", "reading-selection"],
    intentStatement: `Understand selected reading from ${sourceLabel}.`,
    intentUncertainty: "User is reconstructing the claim in the selected fragment before receiving an explanation.",
    expectedWorkArea: targetArea,
    question: {
      prompt: "Before I explain it: in your own words, what claim is this fragment making, and which term or step feels least clear?",
      target_area: targetArea,
      why_it_matters: "Active understanding starts with the reader naming the claim and the unclear term before Sibi explains it.",
      evidence_basis: evidence,
      answer_style: "study_request",
    },
    signalReason: "Runtime prepared a Socratic ownership question for a bounded reading selection.",
    signalEvidence: evidence,
    readingSelection: selection,
  });

  return {
    ok: true,
    data: {
      session_id: session.session_id,
      selection,
      question,
      operation_state: toOperationState("Reading question prepared."),
    },
  };
}

function captureResource(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id?: string;
  resource: Resource & { id: number };
  operation_state: { message: string };
}> {
  const projectLabel = String(payload.project_label || "demo-project").trim();
  const url = String(payload.url || "").trim();
  if (!url) {
    fail("invalid_payload", "capture_resource requires url.");
  }

  const resource: Resource = {
    url,
    title: typeof payload.title === "string" ? payload.title : undefined,
    notes: String(payload.notes || ""),
    project_label: projectLabel,
    resource_type: typeof payload.resource_type === "string" ? payload.resource_type : "url",
    captured_at: now(),
  };

  const resourceID = saveResource(resource);
  const state = readState();
  const session = state.current_session_id ? state.sessions[state.current_session_id] : undefined;
  if (session) {
    session.resource_ids.push(resourceID);
    writeState(state);
  }

  return {
    ok: true,
    data: {
      session_id: session?.session_id,
      resource: { ...resource, id: resourceID },
      operation_state: toOperationState("Resource captured by TypeScript runtime."),
    },
  };
}

function generateQuestionsCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  questions: RuntimeQuestion[];
  learning_signals: LearningSignal[];
  operation_state: { message: string };
}> {
  const state = readState();
  const session = getSession(state, payload.session_id as string | undefined);
  const intent = session.declared_intent;
  if (!intent) {
    fail("missing_intent", "Session has no declared intent.");
  }

  const concept = inferConcept(intent);
  const conceptMap = getConceptMap();
  const detectedLayer = conceptMap[concept]?.current_layer ?? Layer.L2_ISOLATED_EXPLANATION;
  const requiredLayer = MINIMUM_LAYER_FOR_TASK[session.task_type];

  const gaps: DetectedGap[] = detectedLayer >= requiredLayer
    ? []
    : [{
      concept,
      detectedLayer,
      requiredLayer,
      severity: detectedLayer + 1 < requiredLayer ? "critical" : "important",
      confidence: "high",
      evidence: [intent.statement, intent.uncertainty],
      layerDetection: {
        concept,
        highestLayer: detectedLayer,
        observedSignals: [],
        averageConfidence: "high",
      },
    }];

  const generated = generateQuestions(gaps, session.session_id, 3).map(({ question }) => ({
    ...question,
    detected_layer: detectedLayer,
    required_layer: requiredLayer,
  }));

  const signal: LearningSignal | null = gaps[0]
    ? {
      signal_id: randomUUID(),
      created_at: now(),
      source: "ownership_question",
      project_label: session.project_label,
      project_path: intent.project_path,
      concept_or_area: concept,
      reason: "Runtime generated a question from the declared gap.",
      evidence: gaps[0].evidence,
      severity: gaps[0].severity,
      confidence: gaps[0].confidence,
    }
    : null;

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
  writeState(state);

  return {
    ok: true,
    data: {
      session_id: session.session_id,
      questions: session.ownership_questions,
      learning_signals: session.learning_signals,
      operation_state: toOperationState(generated.length > 0 ? "Questions generated in TypeScript runtime." : "No gap detected for the current session."),
    },
  };
}

function answerQuestionCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  session_id: string;
  question: RuntimeQuestion;
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

function noteContextFromPayload(payload: Record<string, unknown>): NoteContext | undefined {
  const context = payload.context && typeof payload.context === "object" ? payload.context as Record<string, unknown> : payload;
  return {
    url: typeof context.url === "string" ? context.url : undefined,
    source_title: typeof context.source_title === "string" ? context.source_title : undefined,
    source_type: typeof context.source_type === "string" ? context.source_type as NoteContext["source_type"] : undefined,
    app_hint: typeof context.app_hint === "string" ? context.app_hint : undefined,
  };
}

function startNoteInput(payload: Record<string, unknown>): StartNoteInput {
  return {
    title: typeof payload.title === "string" ? payload.title : undefined,
    instruction: typeof payload.instruction === "string" ? payload.instruction : undefined,
    context: noteContextFromPayload(payload),
  };
}

function startNoteCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  note: Note;
  operation_state: { message: string };
}> {
  const note = createNote(startNoteInput(payload));
  appendNoteEvent({ event_type: "note_started", note });
  writeActiveNoteID(note.note_id);
  return {
    ok: true,
    data: {
      note,
      operation_state: toOperationState("New active note started."),
    },
  };
}

function appendNoteCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  note: Note;
  operation_state: { message: string };
}> {
  const text = String(payload.text || "").trim();
  if (!text) {
    fail("invalid_payload", "append_note requires text.");
  }

  const input: AppendNoteInput = { ...startNoteInput(payload), text };
  let note = getActiveNote();
  if (!note) {
    note = createNote(input);
    appendNoteEvent({ event_type: "note_started", note });
    writeActiveNoteID(note.note_id);
  }

  const result = applyAppend(note, input);
  appendNoteEvent({
    event_type: "note_appended",
    note_id: result.note.note_id,
    entry: result.entry,
    updated_at: result.note.updated_at,
    instruction: result.note.instruction,
    context: result.note.context,
    title: result.note.title,
    detected_topics: result.note.detected_topics,
  });
  writeActiveNoteID(result.note.note_id);

  return {
    ok: true,
    data: {
      note: result.note,
      operation_state: toOperationState("Note appended to active note."),
    },
  };
}

function getActiveNoteCommand(): RuntimeSuccess<{
  note: Note | null;
  operation_state: { message: string };
}> {
  const note = getActiveNote();
  return {
    ok: true,
    data: {
      note,
      operation_state: toOperationState(note ? "Active note loaded." : "No active note."),
    },
  };
}

function listNotesCommand(payload: Record<string, unknown>): RuntimeSuccess<{
  notes: Note[];
  operation_state: { message: string };
}> {
  const limit = typeof payload.limit === "number" ? payload.limit : 20;
  const notes = listNotes(limit);
  return {
    ok: true,
    data: {
      notes,
      operation_state: toOperationState(`Loaded ${notes.length} recent note(s).`),
    },
  };
}

export function handleRequest(request: RuntimeRequest): RuntimeResponse<unknown> {
  try {
    switch (request.command) {
      case "declare_intent":
        return declareIntent(request.payload);
      case "capture_resource":
        return captureResource(request.payload);
      case "generate_questions":
        return generateQuestionsCommand(request.payload);
      case "answer_question":
        return answerQuestionCommand(request.payload);
      case "prepare_code_question":
        return prepareCodeQuestionCommand(request.payload);
      case "prepare_code_review":
        return prepareCodeReviewCommand(request.payload);
      case "prepare_reading_question":
        return prepareReadingQuestionCommand(request.payload);
      case "get_session_summary":
        return getSessionSummaryCommand(request.payload);
      case "start_note":
        return startNoteCommand(request.payload);
      case "append_note":
        return appendNoteCommand(request.payload);
      case "get_active_note":
        return getActiveNoteCommand();
      case "list_notes":
        return listNotesCommand(request.payload);
    }
  } catch (error) {
    if (error instanceof CodeSelectionError || error instanceof ReadingSelectionError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    if (error instanceof RuntimeError) {
      return { ok: false, error: { code: error.code, message: error.message } };
    }
    return { ok: false, error: { code: "runtime_error", message: error instanceof Error ? error.message : "Unknown runtime error" } };
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
