import type {
  AgentWorkSessionSummary,
  AnswerQuality,
  DeclaredWorkIntent,
  LearningSignal,
  OwnershipQuestion,
  TaskType,
} from "./pedagogy/index.ts";
import type { RuntimeCodeSelection } from "./code-selection.ts";

export type RuntimeCommand =
  | "declare_intent"
  | "prepare_code_question"
  | "generate_questions"
  | "answer_question"
  | "get_session_summary";

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
  code_selection?: RuntimeCodeSelection;
};

export type RuntimeState = {
  current_session_id?: string;
  sessions: Record<string, RuntimeSession>;
};

export type RuntimeSessionSummary = AgentWorkSessionSummary & {
  code_selection?: RuntimeCodeSelection;
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
