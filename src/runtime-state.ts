import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import { fail, type RuntimeSession, type RuntimeSessionSummary, type RuntimeState } from "./runtime-support.ts";

export function runtimeHome(): string {
  return process.env.SIBI_RUNTIME_HOME || join(homedir(), ".sibar");
}

export function statePath(): string {
  return join(runtimeHome(), "runtime-state.json");
}

function ensureRuntimeDir(): void {
  const dir = runtimeHome();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

export function readState(): RuntimeState {
  const path = statePath();
  if (!existsSync(path)) {
    return { sessions: {} };
  }

  try {
    return JSON.parse(readFileSync(path, "utf8")) as RuntimeState;
  } catch {
    return { sessions: {} };
  }
}

export function writeState(state: RuntimeState): void {
  ensureRuntimeDir();
  writeFileSync(statePath(), JSON.stringify(state, null, 2), "utf8");
}

export function getSession(state: RuntimeState, sessionID?: string | null): RuntimeSession {
  const resolvedID = sessionID || state.current_session_id;
  if (!resolvedID) {
    fail("missing_session", "No active session. Declare an intent first.");
  }

  const session = state.sessions[resolvedID];
  if (!session) {
    fail("missing_session", `Session ${resolvedID} was not found.`);
  }

  return session;
}

export function toSummary(session: RuntimeSession): RuntimeSessionSummary {
  return {
    session_id: session.session_id,
    project_label: session.project_label,
    started_at: session.started_at,
    ended_at: session.ended_at ?? null,
    declared_intent: session.declared_intent,
    observed_tools: session.observed_tools,
    learning_signals: session.learning_signals,
    ownership_questions: session.ownership_questions,
    export_state: session.export_state,
    code_selection: session.code_selection,
    reading_selection: session.reading_selection,
    review_plan: session.review_plan,
  };
}
