import * as React from "react";
import styles from "./workspace.module.css";
import type {
  WorkspaceSessionAction,
  WorkspaceSessionState,
} from "../../state/workspaceReducer";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

const actionItems = ["read", "code", "recall"] as const;

export function SessionWorkbench({
  projection,
  state,
  dispatch,
}: {
  projection: WorkspaceSessionProjection;
  state: WorkspaceSessionState;
  dispatch: React.Dispatch<WorkspaceSessionAction>;
}) {
  return (
    <section className={styles.sessionWorkbench} aria-label="Session workbench">
      <header className={styles.sessionHeader}>
        <p className={styles.kicker}>Active session</p>
        <h1>{projection.title}</h1>
      </header>

      <article className={styles.currentQuestion}>
        <p className={styles.kicker}>Current focus</p>
        <h2>{projection.selectedNode.name}</h2>
        <p>{projection.selectedNode.scope}</p>
      </article>

      <article className={styles.currentMiniNode}>
        <p className={styles.kicker}>Current mini-node</p>
        <h3>{projection.selectedMiniNode.name}</h3>
        <p>{projection.selectedMiniNode.question}</p>
      </article>

      <div className={styles.actionRow} role="radiogroup" aria-label="Session actions">
        {actionItems.map((action) => (
          <button
            key={action}
            type="button"
            aria-pressed={state.activeAction === action}
            className={styles.actionButton}
            data-active={state.activeAction === action ? "true" : "false"}
            onClick={() => dispatch({ type: "set_active_action", action })}
          >
            {action}
          </button>
        ))}
      </div>

      <article className={styles.sourceWindow}>
        <div className={styles.sourceWindowHeader}>
          <p className={styles.kicker}>Source / evidence</p>
          <button
            type="button"
            className={styles.sourceButton}
            onClick={() =>
              dispatch({
                type: "select_source",
                sourceId: projection.selectedSource.id,
              })
            }
          >
            Use source
          </button>
        </div>
        <h3>{projection.selectedSource.title}</h3>
        <p>{projection.selectedSource.snippet}</p>
      </article>
    </section>
  );
}
