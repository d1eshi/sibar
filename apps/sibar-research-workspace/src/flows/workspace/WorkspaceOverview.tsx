import * as React from "react";
import styles from "./workspace.module.css";
import type {
  WorkspaceSessionAction,
  WorkspaceSessionState,
} from "../../state/workspaceReducer";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

interface WorkspaceOverviewProps {
  projection: WorkspaceSessionProjection;
  state: WorkspaceSessionState;
  dispatch: React.Dispatch<WorkspaceSessionAction>;
  onOpenSelectedNode: () => void;
}

export function WorkspaceOverview({
  projection,
  state,
  dispatch,
  onOpenSelectedNode,
}: WorkspaceOverviewProps) {
  return (
    <section className={styles.workspaceOverview} data-component="workspace-overview">
      <aside className={styles.overviewRail} aria-label="Workspace learning path">
        <p className={styles.kicker}>Workspace</p>
        <h1>{projection.title}</h1>
        <p>{projection.sessionHint}</p>

        <dl className={styles.overviewStats}>
          <div>
            <dt>Nodes</dt>
            <dd>{projection.nodes.length}</dd>
          </div>
          <div>
            <dt>Sources</dt>
            <dd>{projection.sourceCount}</dd>
          </div>
          <div>
            <dt>Primary actions</dt>
            <dd>Read / Build / Recall</dd>
          </div>
        </dl>
      </aside>

      <section className={styles.nodeBoard} aria-label="Available learning nodes">
        <div className={styles.boardHeader}>
          <div>
            <p className={styles.kicker}>Learning path</p>
            <h2>Choose where to start</h2>
          </div>
          <button type="button" className={styles.primaryAction} onClick={onOpenSelectedNode}>
            Start selected node
          </button>
        </div>

        <ol className={styles.nodeCards}>
          {projection.nodes.map((node, index) => {
            const isSelected = node.id === state.selectedNodeId;
            const firstMiniNode = node.miniNodes[0];
            return (
              <li key={node.id}>
                <button
                  type="button"
                  className={isSelected ? styles.nodeCardSelected : styles.nodeCard}
                  onClick={() =>
                    dispatch({
                      type: "select_node",
                      nodeId: node.id,
                      miniNodeId: firstMiniNode?.id ?? state.selectedMiniNodeId,
                      sourceId: firstMiniNode?.sourceId ?? state.selectedSourceId,
                    })
                  }
                >
                  <span className={styles.nodeIndex}>{index + 1}</span>
                  <span className={styles.nodeCardBody}>
                    <strong>{node.name}</strong>
                    <span>{node.scope}</span>
                    <em>{node.sessionTitle}</em>
                  </span>
                  <span className={styles.nodeStatus} data-status={node.status}>
                    {node.status}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>

      <aside className={styles.overviewGuide} aria-label="Workspace guidance">
        <p className={styles.kicker}>Next step</p>
        <h2>{projection.selectedNode.name}</h2>
        <p>{projection.selectedNode.scope}</p>
        <p className={styles.readinessSummary}>
          {projection.sourceCount} sources ready. Open one node, produce one artifact, then
          confirm evidence before readiness.
        </p>
        <ul>
          {projection.selectedNode.miniNodes.map((miniNode) => (
            <li key={miniNode.id}>{miniNode.name}</li>
          ))}
        </ul>
        <button type="button" className={styles.secondaryAction} onClick={onOpenSelectedNode}>
          Open node session
        </button>
      </aside>
    </section>
  );
}
