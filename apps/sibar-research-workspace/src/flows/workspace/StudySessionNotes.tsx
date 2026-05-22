import type * as React from "react";
import styles from "./workspace.module.css";
import type { WorkspaceStudyNote } from "../../state/workspaceReducer";

interface StudySessionNotesProps {
  courseTitle: string;
  noteDraft: string;
  notes: readonly WorkspaceStudyNote[];
  currentSessionTitle: string;
  currentSourceTitle: string;
  onCourseTitleChange: (courseTitle: string) => void;
  onNoteDraftChange: (noteDraft: string) => void;
  onAddNote: () => void;
}

function getLocalDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function StudySessionNotes({
  courseTitle,
  noteDraft,
  notes,
  currentSessionTitle,
  currentSourceTitle,
  onCourseTitleChange,
  onNoteDraftChange,
  onAddNote,
}: StudySessionNotesProps) {
  const now = Date.now();
  const todayKey = getLocalDateKey(new Date(now));
  const notesToday = notes.filter((note) => {
    return note.createdAtDateKey === todayKey;
  }).length;
  const notesThisWeek = notes.filter((note) => {
    const ageMs = now - note.createdAtEpochMs;

    return ageMs >= 0 && ageMs < 7 * 24 * 60 * 60 * 1000;
  }).length;

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
            <dd>{notesToday}</dd>
          </div>
          <div>
            <dt>Week</dt>
            <dd>{notesThisWeek}</dd>
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
