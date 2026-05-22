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
}

export function StudyPathRail({
  projection,
  state,
  dispatch,
  courseTitle,
  notes,
}: StudyPathRailProps) {
  const recentNotes = notes.slice(0, 4);

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
        <section className={styles.activeSessionCard}>
          <p className={styles.kicker}>Current session</p>
          <h3>{projection.selectedNode.sessionTitle}</h3>
          <p>{projection.selectedNode.scope}</p>
        </section>

        <section className={styles.activeSessionCard}>
          <p className={styles.kicker}>Source</p>
          <h3>{projection.selectedSource.title}</h3>
          <p>{projection.selectedSource.snippet}</p>
        </section>

        <section className={styles.activeSessionOutline}>
          <p className={styles.kicker}>Note outline</p>
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
          <p className={styles.kicker}>Recent notes</p>
          {recentNotes.length === 0 ? (
            <p>No entries yet for this study session.</p>
          ) : (
            <ul>
              {recentNotes.map((note) => (
                <li key={note.id}>
                  <strong>{note.iterationLabel}</strong>
                  <span>{note.body}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
