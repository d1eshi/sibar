import type {
  AgentWorkSessionSummary,
  AnswerQuality,
  DeclaredWorkIntent,
  LearningSignal,
  OwnershipQuestion,
  TaskType,
} from "./pedagogy/index.ts";
import type { RuntimeCodeSelection } from "./code-selection.ts";
import type { RuntimeReadingSelection } from "./reading-selection.ts";

export type RuntimeCommand =
  | "capture_resource"
  | "declare_intent"
  | "generate_questions"
  | "answer_question"
  | "prepare_code_question"
  | "prepare_code_review"
  | "prepare_reading_question"
  | "get_session_summary"
  | "start_note"
  | "append_note"
  | "get_active_note"
  | "list_notes";

export type RuntimeRequest = {
  command: RuntimeCommand;
  payload: Record<string, unknown>;
};

export type RuntimeSuccess<T> = { ok: true; data: T };
export type RuntimeFailure = { ok: false; error: { code: string; message: string } };
export type RuntimeResponse<T> = RuntimeSuccess<T> | RuntimeFailure;

export type RuntimeQuestion = OwnershipQuestion & {
  detected_layer: number;
  required_layer: number;
  answer?: string;
  answer_quality?: AnswerQuality;
};

export type ReviewedFile = {
  file_path: string;
  project_path: string;
  language: string;
  relevance: "primary" | "supporting";
  rationale: string;
};

export type RuntimeReviewPlan = {
  project_label: string;
  project_path: string;
  objective: string;
  reviewed_files: ReviewedFile[];
  active_file: ReviewedFile;
  highlighted_range: {
    start_line: number;
    end_line: number;
  };
  selection: RuntimeCodeSelection;
  excerpt: string;
  rationale: string;
};

export type RuntimeSession = {
  session_id: string;
  project_label: string;
  started_at: string;
  ended_at?: string | null;
  declared_intent: DeclaredWorkIntent | null;
  observed_tools: string[];
  learning_signals: LearningSignal[];
  ownership_questions: RuntimeQuestion[];
  export_state: AgentWorkSessionSummary["export_state"];
  task_type: TaskType;
  resource_ids: number[];
  code_selection?: RuntimeCodeSelection;
  reading_selection?: RuntimeReadingSelection;
  review_plan?: RuntimeReviewPlan;
};

export type RuntimeState = {
  current_session_id?: string;
  sessions: Record<string, RuntimeSession>;
};

export type RuntimeSessionSummary = AgentWorkSessionSummary & {
  code_selection?: RuntimeCodeSelection;
  reading_selection?: RuntimeReadingSelection;
  review_plan?: RuntimeReviewPlan;
};

export class RuntimeError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function fail(code: string, message: string): never {
  throw new RuntimeError(code, message);
}

export function now(): string {
  return new Date().toISOString();
}

export function excerptPrefix(value: string, maxLength = 180): string {
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 1)}…`;
}

export function toOperationState(message: string): { message: string } {
  return { message };
}
