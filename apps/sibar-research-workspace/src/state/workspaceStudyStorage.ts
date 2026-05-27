import type { WorkspaceStudyNote } from "./workspaceReducer";
import { shouldUseLocalWorkspaceStorage } from "../config/publicRuntimeConfig";

const studyNotesStorageKey = "sibar:workspace-study-notes:v2";

export type StoredStudyNotesState = {
  version: 2;
  courseTitle: string;
  notes: readonly WorkspaceStudyNote[];
};

function isStudyNote(value: unknown): value is WorkspaceStudyNote {
  if (!value || typeof value !== "object") {
    return false;
  }

  const note = value as Record<string, unknown>;

  return (
    typeof note.id === "string" &&
    typeof note.courseTitle === "string" &&
    typeof note.sessionTitle === "string" &&
    typeof note.nodeName === "string" &&
    typeof note.miniNodeQuestion === "string" &&
    typeof note.sourceTitle === "string" &&
    typeof note.createdAtIso === "string" &&
    typeof note.createdAtLabel === "string" &&
    typeof note.createdAtEpochMs === "number" &&
    Number.isFinite(note.createdAtEpochMs) &&
    typeof note.createdAtDateKey === "string" &&
    typeof note.iterationLabel === "string" &&
    typeof note.body === "string"
  );
}

export function readStoredStudyNotesState(): Partial<StoredStudyNotesState> {
  if (typeof window === "undefined" || !shouldUseLocalWorkspaceStorage()) {
    return {};
  }

  try {
    const rawValue = window.localStorage.getItem(studyNotesStorageKey);

    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as unknown;

    if (!parsed || typeof parsed !== "object") {
      return {};
    }

    const stored = parsed as Record<string, unknown>;

    if (
      stored.version !== 2 ||
      typeof stored.courseTitle !== "string" ||
      !Array.isArray(stored.notes) ||
      !stored.notes.every(isStudyNote)
    ) {
      return {};
    }

    return {
      courseTitle: stored.courseTitle,
      notes: stored.notes,
    };
  } catch {
    return {};
  }
}

export function writeStoredStudyNotesState(state: StoredStudyNotesState) {
  if (typeof window === "undefined" || !shouldUseLocalWorkspaceStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(studyNotesStorageKey, JSON.stringify(state));
  } catch {
    // Local note capture should keep working even when storage is unavailable.
  }
}
