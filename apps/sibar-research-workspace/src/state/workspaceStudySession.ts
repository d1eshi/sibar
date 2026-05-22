import type { WorkspaceStudyNote } from "./workspaceReducer";
import type { WorkspaceMiniNode, WorkspaceSource, WorkspaceStudyNode } from "./workspaceProjection";

export const defaultStudyCourseTitle =
  "Curso de Estadística y Probabilidad - Platzi";

const studyNoteDateFormatter = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "medium",
  timeStyle: "short",
});

export type WorkspaceStudyNoteContext = {
  courseTitle: string;
  selectedNode: WorkspaceStudyNode;
  selectedMiniNode: WorkspaceMiniNode;
  selectedSource: WorkspaceSource;
  noteCount: number;
  now?: Date;
};

export function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function createWorkspaceStudyNote(
  body: string,
  context: WorkspaceStudyNoteContext,
): WorkspaceStudyNote {
  const now = context.now ?? new Date();
  const noteNumber = context.noteCount + 1;
  const createdAtEpochMs = now.getTime();

  return {
    id: `study-note-${createdAtEpochMs}-${noteNumber}`,
    courseTitle: context.courseTitle.trim() || "Untitled course",
    sessionTitle: context.selectedNode.sessionTitle,
    nodeName: context.selectedNode.name,
    miniNodeQuestion: context.selectedMiniNode.question,
    sourceTitle: context.selectedSource.title,
    createdAtIso: now.toISOString(),
    createdAtLabel: studyNoteDateFormatter.format(now),
    createdAtEpochMs,
    createdAtDateKey: getLocalDateKey(now),
    iterationLabel: `Entry ${noteNumber}`,
    body,
  };
}
