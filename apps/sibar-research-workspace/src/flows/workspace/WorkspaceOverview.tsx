import * as React from "react";
import styles from "./workspaceOverview.module.css";
import type {
  WorkspaceSessionAction,
  WorkspaceSessionState,
} from "../../state/workspaceReducer";
import type {
  WorkspaceSessionProjection,
  WorkspaceStudyNode,
} from "../../state/workspaceProjection";

interface WorkspaceOverviewProps {
  projection: WorkspaceSessionProjection;
  state: WorkspaceSessionState;
  dispatch: React.Dispatch<WorkspaceSessionAction>;
  onOpenSelectedNode: () => void;
}

function getStudyHeadline(node: WorkspaceStudyNode): string {
  return node.scope;
}

function getProgressStep(nodes: readonly WorkspaceStudyNode[]): number {
  const activeIndex = nodes.findIndex((node) => node.status !== "complete");
  return activeIndex >= 0 ? activeIndex + 1 : nodes.length;
}

function getProgressLabel(nodes: readonly WorkspaceStudyNode[]): string {
  const currentStep = getProgressStep(nodes);
  return `${currentStep} of ${nodes.length}`;
}

export function WorkspaceOverview({
  projection,
  state,
  dispatch,
  onOpenSelectedNode,
}: WorkspaceOverviewProps) {
  const progressLabel = getProgressLabel(projection.nodes);
  const progressPercent = `${Math.max(
    20,
    Math.round((getProgressStep(projection.nodes) / Math.max(projection.nodes.length, 1)) * 100),
  )}%`;

  function selectNode(node: WorkspaceStudyNode) {
    const firstMiniNode = node.miniNodes[0];
    dispatch({
      type: "select_node",
      nodeId: node.id,
      miniNodeId: firstMiniNode?.id ?? state.selectedMiniNodeId,
      sourceId: firstMiniNode?.sourceId ?? state.selectedSourceId,
    });
  }

  function openSelectedNode() {
    dispatch({ type: "select_source", sourceId: projection.selectedMiniNode.sourceId });
    onOpenSelectedNode();
  }

  return (
    <section className={styles.workspaceOverview} data-component="workspace-overview">
      <aside className={styles.overviewPathRail} aria-label="Workspace study path">
        <header className={styles.overviewPathHeader}>
          <div className={styles.overviewRailTitle}>
            <span className={styles.studyPathGlyph} aria-hidden="true" />
            <strong>Study Path</strong>
            <button type="button" className={styles.railUtilityButton} aria-label="Path menu">
              <span />
            </button>
          </div>
          <h2>{projection.title}</h2>
          <p>{progressLabel}</p>
          <span className={styles.overviewProgressTrack} aria-hidden="true">
            <span style={{ width: progressPercent }} />
          </span>
        </header>

        <ol className={styles.overviewPathList}>
          {projection.nodes.map((node, index) => {
            const isSelected = node.id === state.selectedNodeId;
            return (
              <li key={node.id} className={styles.overviewPathItem} data-state={node.status}>
                <button
                  type="button"
                  className={styles.overviewPathButton}
                  aria-current={isSelected ? "step" : undefined}
                  onClick={() => selectNode(node)}
                >
                  <span className={styles.overviewNodeBadge}>{index + 1}</span>
                  <strong>{index + 1}. {node.name}</strong>
                  <span className={styles.overviewChevron} aria-hidden="true" />
                </button>

                {isSelected ? (
                  <ol className={styles.overviewMiniList}>
                    {node.miniNodes.map((miniNode, miniIndex) => (
                      <li key={miniNode.id}>
                        <button
                          type="button"
                          className={styles.overviewMiniButton}
                          aria-current={
                            miniNode.id === state.selectedMiniNodeId ? "step" : undefined
                          }
                          onClick={() =>
                            dispatch({
                              type: "select_mini_node",
                              miniNodeId: miniNode.id,
                              sourceId: miniNode.sourceId,
                            })
                          }
                        >
                          <span>{index + 1}.{miniIndex + 1}</span>
                          <strong>{miniNode.name}</strong>
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </li>
            );
          })}
        </ol>

        <footer className={styles.overviewPathFooter}>
          <span>
            <strong>Today</strong>
            <em>45m focused</em>
          </span>
          <span>
            <strong>{projection.sourceCount + projection.nodes.length}</strong>
            <em>Items</em>
          </span>
          <span className={styles.focusFlame} aria-hidden="true" />
        </footer>
      </aside>

      <section className={styles.overviewStudyPanel} aria-label="Workspace study overview">
        <header className={styles.overviewStudyHeader}>
          <div>
            <p className={styles.kicker}>Current study</p>
            <h1>{getStudyHeadline(projection.selectedNode)}</h1>
          </div>
          <div className={styles.overviewStudyUtilities} aria-hidden="true">
            <span>Mark</span>
            <span />
          </div>
        </header>

        <div className={styles.overviewDivider} />

        <section
          className={styles.overviewActionSection}
          aria-label="Open selected learning node"
        >
          <h2>Selected learning node</h2>
          <div className={styles.overviewOpenSessionGrid}>
            <button
              type="button"
              className={styles.overviewOpenSessionButton}
              onClick={openSelectedNode}
            >
              <span>
                <strong>{projection.selectedNode.name}</strong>
                <em>
                  Resume with{" "}
                  <strong>{projection.selectedMaterial.modeLabel}</strong> material in this session.
                </em>
              </span>
            </button>
          </div>
        </section>

        <section className={styles.overviewEvidenceSection} aria-label="Evidence from sources">
          <header className={styles.overviewEvidenceHeader}>
            <h2>
              Evidence from sources <span>{projection.sourceCount}</span>
            </h2>
            <button type="button">View all</button>
          </header>

          <ol className={styles.overviewSourceList}>
            {projection.sources.map((source) => (
              <li key={source.id}>
                <button
                  type="button"
                  className={styles.overviewSourceButton}
                  onClick={() => dispatch({ type: "select_source", sourceId: source.id })}
                >
                  <span className={styles.overviewSourceIcon} data-source={source.type} />
                  <span className={styles.overviewSourceText}>
                    <strong>{source.title}</strong>
                    <em>{source.metadata}</em>
                  </span>
                  <q>{source.snippet}</q>
                  <span className={styles.sourceMore} aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </section>
      </section>

      <aside className={styles.overviewTutorRail} aria-label="Sibar tutor guidance">
        <header className={styles.tutorHeader}>
          <span className={styles.tutorGlyph} aria-hidden="true" />
          <strong>Sibar Tutor</strong>
          <span className={styles.tutorHeaderDots} aria-hidden="true" />
        </header>

        <section className={styles.tutorStatusCard}>
          <span className={styles.seedlingMark} aria-hidden="true" />
          <div>
            <strong>You're on track</strong>
            <p>Keep going with purpose.</p>
          </div>
          <span className={styles.tutorProgressTrack} aria-hidden="true">
            <span />
          </span>
        </section>

        <section className={styles.guidanceCard}>
          <h2>Focus guidance</h2>
          <article>
            <span className={styles.guidanceIcon} data-kind="focus" />
            <div>
              <strong>Focus</strong>
              <p>Identify the failure case.</p>
            </div>
          </article>
          <article>
            <span className={styles.guidanceIcon} data-kind="consider" />
            <div>
              <strong>Consider</strong>
              <p>Compare source claim and artifact.</p>
            </div>
          </article>
          <article>
            <span className={styles.guidanceIcon} data-kind="produce" />
            <div>
              <strong>Produce</strong>
              <p>Create one evidence-backed note.</p>
            </div>
          </article>
        </section>

        <section className={styles.readinessCard}>
          <h2>Readiness</h2>
          <div>
            <span className={styles.readinessMeter}>78%</span>
            <span>
              <strong>Good readiness</strong>
              <p>Open the selected learning node to continue this study material.</p>
            </span>
          </div>
        </section>

        <button type="button" className={styles.askTutorButton}>
          Ask a question...
          <span>Cmd K</span>
        </button>
      </aside>
    </section>
  );
}
