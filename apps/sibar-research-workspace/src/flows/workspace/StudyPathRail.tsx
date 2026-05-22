import * as React from "react";
import styles from "./workspace.module.css";
import type {
  WorkspaceSessionAction,
  WorkspaceSessionState,
  WorkspaceStudyNote,
} from "../../state/workspaceReducer";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

interface StudyPathRailProps {
  projection: WorkspaceSessionProjection;
  state: WorkspaceSessionState;
  dispatch: React.Dispatch<WorkspaceSessionAction>;
  courseTitle: string;
  notes: readonly WorkspaceStudyNote[];
  currentNoteTitle: string;
}

export function StudyPathRail({
  projection,
  state,
  dispatch,
  courseTitle,
  notes,
  currentNoteTitle,
}: StudyPathRailProps) {
  const latestNote = notes[0];

  return (
    <aside className={styles.studyPathRail} aria-label="Active study session rail">
      <header className={styles.railHeader}>
        <div className={styles.railTitle}>
          <span className={styles.studyPathGlyph} aria-hidden="true" />
          <strong>Active study session</strong>
        </div>
        <h2>{courseTitle}</h2>
      </header>

      <div className={styles.activeSessionRailBody}>
        <nav className={styles.courseNoteTree} aria-label="Course notebook">
          <button type="button" className={styles.courseNoteTreeItemActive}>
            <span aria-hidden="true" />
            <strong>{currentNoteTitle}</strong>
            <em>{projection.selectedNode.sessionTitle}</em>
          </button>
        </nav>

        <section className={styles.activeSessionOutline}>
          <p className={styles.kicker}>Clase</p>
          <ol className={styles.miniNodeList}>
            {projection.selectedNode.miniNodes.map((miniNode, miniIndex) => (
              <li key={miniNode.id}>
                <button
                  type="button"
                  className={
                    miniNode.id === state.selectedMiniNodeId
                      ? styles.miniNodeButtonActive
                      : styles.miniNodeButton
                  }
                  onClick={() =>
                    dispatch({
                      type: "select_mini_node",
                      miniNodeId: miniNode.id,
                      sourceId: miniNode.sourceId,
                    })
                  }
                >
                  <span>{miniIndex + 1}</span>
                  <strong>{miniNode.name}</strong>
                  <em>{miniNode.question}</em>
                </button>
              </li>
            ))}
          </ol>
        </section>

        <section className={styles.activeSessionNotes}>
          <p className={styles.kicker}>Ultima nota</p>
          {latestNote ? (
            <p>{latestNote.body}</p>
          ) : (
            <p>Todavia no hay entradas guardadas para esta clase.</p>
          )}
        </section>
      </div>
    </aside>
  );
}
