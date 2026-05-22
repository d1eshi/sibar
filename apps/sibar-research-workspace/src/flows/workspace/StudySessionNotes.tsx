import type * as React from "react";
import styles from "./workspace.module.css";
import type { WorkspaceStudyNote } from "../../state/workspaceReducer";
import type { WorkspaceStudyNoteMetrics } from "../../state/workspaceStudyMetrics";

interface StudySessionNotesProps {
  courseTitle: string;
  noteDraft: string;
  notes: readonly WorkspaceStudyNote[];
  metrics: WorkspaceStudyNoteMetrics;
  currentSessionTitle: string;
  currentSourceTitle: string;
  onCourseTitleChange: (courseTitle: string) => void;
  onNoteDraftChange: (noteDraft: string) => void;
  onAddNote: () => void;
}

export function StudySessionNotes({
  courseTitle,
  noteDraft,
  notes,
  metrics,
  currentSessionTitle,
  currentSourceTitle,
  onCourseTitleChange,
  onNoteDraftChange,
  onAddNote,
}: StudySessionNotesProps) {
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onAddNote();
  }

  return (
    <section className={styles.studyNotesPanel} aria-label="Study session notes">
      <header className={styles.studyNotesHeader}>
        <div>
          <p className={styles.kicker}>Study session</p>
          <h3>Notes</h3>
        </div>
        <dl className={styles.studyNoteStats}>
          <div>
            <dt>Today</dt>
            <dd>{metrics.notesToday}</dd>
          </div>
          <div>
            <dt>Week</dt>
            <dd>{metrics.notesThisWeek}</dd>
          </div>
        </dl>
      </header>

      <form className={styles.studyNoteComposer} onSubmit={handleSubmit}>
        <label>
          <span>Course</span>
          <input
            type="text"
            value={courseTitle}
            placeholder="Platzi course"
            onChange={(event) => onCourseTitleChange(event.currentTarget.value)}
          />
        </label>

        <div className={styles.studyNoteContext}>
          <span>{currentSessionTitle}</span>
          <span>{currentSourceTitle}</span>
        </div>

        <label>
          <span>New entry</span>
          <textarea
            rows={7}
            value={noteDraft}
            placeholder="Concept, example, question..."
            onChange={(event) => onNoteDraftChange(event.currentTarget.value)}
          />
        </label>

        <button type="submit" disabled={noteDraft.trim().length === 0}>
          Save entry
        </button>
      </form>

      <div className={styles.studyNoteList} aria-label="Saved study entries">
        {notes.length === 0 ? (
          <p className={styles.emptyStudyNotes}>No study notes in this session.</p>
        ) : (
          notes.map((note) => (
            <article key={note.id} className={styles.studyNoteCard}>
              <header>
                <p>{note.iterationLabel}</p>
                <time dateTime={note.createdAtIso}>{note.createdAtLabel}</time>
              </header>
              <p>{note.body}</p>
              <footer>
                <span>{note.courseTitle}</span>
                <span>{note.sessionTitle}</span>
                <span>{note.sourceTitle}</span>
              </footer>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
