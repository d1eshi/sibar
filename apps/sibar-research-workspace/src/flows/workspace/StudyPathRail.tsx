import * as React from "react";
import styles from "./workspace.module.css";
import type {
  WorkspaceSessionAction,
  WorkspaceSessionState,
} from "../../state/workspaceReducer";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

function formatHint(scope: string): string {
  return `Study ${scope.toLowerCase()}`;
}

interface StudyPathRailProps {
  projection: WorkspaceSessionProjection;
  state: WorkspaceSessionState;
  dispatch: React.Dispatch<WorkspaceSessionAction>;
}

export function StudyPathRail({
  projection,
  state,
  dispatch,
}: StudyPathRailProps) {
  return (
    <aside className={styles.studyPathRail} aria-label="Study path rail">
      <header className={styles.railHeader}>
        <p className={styles.kicker}>Study path</p>
        <h2>Active path</h2>
      </header>

      <ol className={styles.pathList}>
        {projection.nodes.map((node) => {
          const miniNodes = node.miniNodes;
          return (
            <li key={node.id} className={styles.pathNode}>
              <button
                type="button"
                className={
                  node.id === state.selectedNodeId
                    ? styles.pathNodeButtonActive
                    : styles.pathNodeButton
                }
                onClick={() => {
                  dispatch({
                    type: "select_node",
                    nodeId: node.id,
                    miniNodeId: miniNodes[0]?.id ?? state.selectedMiniNodeId,
                    sourceId: miniNodes[0]?.sourceId ?? state.selectedSourceId,
                  });
                }}
              >
                <strong>{node.name}</strong>
                <span>{formatHint(node.scope)}</span>
              </button>

              <ul className={styles.miniNodeList}>
                {miniNodes.map((miniNode) => (
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
                      {miniNode.name}
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
