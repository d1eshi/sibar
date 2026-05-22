import type * as React from "react";
import styles from "./workspace.module.css";
import type { WorkspaceStudyNote } from "../../state/workspaceReducer";
import type { WorkspaceStudyNoteMetrics } from "../../state/workspaceStudyMetrics";

interface StudySessionNotesProps {
  courseTitle: string;
  noteTitle: string;
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
  noteTitle,
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
          <p className={styles.kicker}>{courseTitle}</p>
          <h1>{noteTitle}</h1>
          <p>{currentSessionTitle}</p>
        </div>
        <p className={styles.studyNoteStatsLine}>
          {metrics.notesToday} hoy / {metrics.notesThisWeek} esta semana
        </p>
      </header>

      <form className={styles.studyNoteComposer} onSubmit={handleSubmit}>
        <div className={styles.studyNoteMetaRow}>
          <label>
            <span>Curso</span>
            <input
              type="text"
              value={courseTitle}
              placeholder="Curso de Platzi"
              onChange={(event) => onCourseTitleChange(event.currentTarget.value)}
            />
          </label>

          <div className={styles.studyNoteContext}>
            <span>{currentSourceTitle}</span>
            <span>Guardado localmente en esta sesion</span>
          </div>
        </div>

        <label className={styles.studyNoteBodyField}>
          <span>Nota</span>
          <textarea
            rows={16}
            value={noteDraft}
            placeholder="Escribi tus notas de la clase..."
            onChange={(event) => onNoteDraftChange(event.currentTarget.value)}
          />
        </label>

        <div className={styles.studyNoteActions}>
          <button type="submit" disabled={noteDraft.trim().length === 0}>
            Guardar nota
          </button>
          <span>{notes.length} entradas guardadas</span>
        </div>
      </form>

      <div className={styles.studyNoteList} aria-label="Saved study entries">
        {notes.length === 0 ? (
          <p className={styles.emptyStudyNotes}>No hay notas guardadas en esta clase.</p>
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
