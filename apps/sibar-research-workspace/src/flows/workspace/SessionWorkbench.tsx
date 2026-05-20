import * as React from "react";
import styles from "./workspace.module.css";
import type {
  WorkspaceSessionAction,
  WorkspaceSessionState,
} from "../../state/workspaceReducer";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

const actionItems = [
  {
    kind: "read",
    label: "Read",
    hint: "Reconstruct the claim before hints.",
    output: "One source-backed note",
  },
  {
    kind: "code",
    label: "Build",
    hint: "Scope the smallest proof artifact.",
    output: "One bounded artifact",
  },
  {
    kind: "recall",
    label: "Recall",
    hint: "Attempt from memory without notes.",
    output: "One checked answer",
  },
] as const;

function getActionLabel(kind: typeof actionItems[number]["kind"]): string {
  return actionItems.find((action) => action.kind === kind)?.label ?? "Read";
}

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
        <div>
          <p className={styles.kicker}>Active node session</p>
          <h1>{projection.selectedNode.sessionTitle}</h1>
        </div>
        <span className={styles.sessionMark} aria-hidden="true" />
      </header>

      <div className={styles.sessionDivider} />

      <section className={styles.sessionReadingPanel} aria-label="Active learning node">
        <article className={styles.currentQuestion}>
          <p className={styles.kicker}>Current study node</p>
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
              key={action.kind}
              type="button"
              aria-pressed={state.activeAction === action.kind}
              className={styles.actionButton}
              data-action={action.kind}
              data-active={state.activeAction === action.kind ? "true" : "false"}
              onClick={() =>
                dispatch({ type: "set_active_action", action: action.kind })
              }
            >
              <span className={styles.actionIcon} aria-hidden="true" />
              <span>
                <strong>{action.label}</strong>
                <em>{action.hint}</em>
              </span>
            </button>
          ))}
        </div>

        <article className={styles.sourceWindow}>
          <div className={styles.sourceWindowHeader}>
            <div>
              <p className={styles.kicker}>Source / evidence</p>
              <h3>{projection.selectedSource.title}</h3>
            </div>
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
          <q>{projection.selectedSource.snippet}</q>
          <footer className={styles.sourceLedger}>
            <span>{projection.selectedSource.metadata}</span>
            <strong>{getActionLabel(state.activeAction)} output</strong>
          </footer>
        </article>

        <article className={styles.outputContract}>
          <p className={styles.kicker}>Session output contract</p>
          <ul>
            {actionItems.map((action) => (
              <li
                key={action.kind}
                data-active={state.activeAction === action.kind ? "true" : "false"}
              >
                <strong>{action.label}</strong>
                <span>{action.output}</span>
              </li>
            ))}
          </ul>
        </article>
      </section>
    </section>
  );
}
