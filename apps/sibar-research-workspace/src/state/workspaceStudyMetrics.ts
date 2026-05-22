import type { WorkspaceStudyNote } from "./workspaceReducer";
import { getLocalDateKey } from "./workspaceStudySession";

export type WorkspaceStudyNoteMetrics = {
  notesToday: number;
  notesThisWeek: number;
  totalNotes: number;
};

const oneWeekMs = 7 * 24 * 60 * 60 * 1000;

export function projectWorkspaceStudyNoteMetrics(
  notes: readonly WorkspaceStudyNote[],
  now = new Date(),
): WorkspaceStudyNoteMetrics {
  const nowEpochMs = now.getTime();
  const todayKey = getLocalDateKey(now);

  return notes.reduce<WorkspaceStudyNoteMetrics>(
    (metrics, note) => {
      const ageMs = nowEpochMs - note.createdAtEpochMs;

      return {
        notesToday:
          note.createdAtDateKey === todayKey
            ? metrics.notesToday + 1
            : metrics.notesToday,
        notesThisWeek:
          ageMs >= 0 && ageMs < oneWeekMs
            ? metrics.notesThisWeek + 1
            : metrics.notesThisWeek,
        totalNotes: metrics.totalNotes + 1,
      };
    },
    {
      notesToday: 0,
      notesThisWeek: 0,
      totalNotes: 0,
    },
  );
}
