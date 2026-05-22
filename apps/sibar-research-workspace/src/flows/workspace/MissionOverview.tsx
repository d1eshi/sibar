import * as React from "react";
import styles from "./missionOverview.module.css";
import type { WorkspaceSessionAction, WorkspaceSessionState } from "../../state/workspaceReducer";
import type {
  WorkspaceSessionProjection,
  WorkspaceStudyNode,
} from "../../state/workspaceProjection";
import type { MissionQueueSessionProjection, MissionUiProjection } from "../../../../../engine/workspace/source-mission/ui-projection.ts";

interface MissionOverviewProps {
  mission: MissionUiProjection;
  projection: WorkspaceSessionProjection;
  state: WorkspaceSessionState;
  dispatch: React.Dispatch<WorkspaceSessionAction>;
  onOpenSelectedNode: () => void;
}

function queueLabel(status: MissionQueueSessionProjection["status"]): string {
  if (status === "now") return "Now";
  if (status === "next") return "Next";
  if (status === "later") return "Later";
  return "Locked";
}

function allQueueSessions(mission: MissionUiProjection): MissionQueueSessionProjection[] {
  return [
    ...mission.focused_queue.visible_sessions,
    ...mission.focused_queue.deferred_sessions,
    ...mission.focused_queue.locked_sessions,
  ];
}

function activeNodeForSession(
  session: MissionQueueSessionProjection,
  nodes: readonly WorkspaceStudyNode[],
): WorkspaceStudyNode | undefined {
  return nodes.find((node) => node.id === session.id);
}

export function MissionOverview({
  mission,
  projection,
  state,
  dispatch,
  onOpenSelectedNode,
}: MissionOverviewProps) {
  const sourceContext = mission.mission_brief.source_context;
  const queueSessions = allQueueSessions(mission);

  function selectSession(session: MissionQueueSessionProjection) {
    const node = activeNodeForSession(session, projection.nodes);
    const firstMiniNode = node?.miniNodes[0];
    if (!node || !firstMiniNode) return;

    dispatch({
      type: "select_node",
      nodeId: node.id,
      miniNodeId: firstMiniNode.id,
      sourceId: firstMiniNode.sourceId,
    });
  }

  function openSession(session: MissionQueueSessionProjection) {
    selectSession(session);
    onOpenSelectedNode();
  }

  return (
    <section className={styles.missionOverview} data-component="mission-brief">
      <header className={styles.missionHeader}>
        <div>
          <p className={styles.kicker}>Mission Brief</p>
          <h1>{mission.mission_brief.title}</h1>
          <p>{mission.mission_brief.rationale}</p>
        </div>
        <aside className={styles.readinessCard} aria-label="Progress and readiness">
          <span>{mission.mission_brief.confidence}</span>
          <strong>{projection.nodes.length} focused sessions</strong>
          <p>{mission.active_session.readiness_scope.label}</p>
        </aside>
      </header>

      <section className={styles.contextGrid} aria-label="Mission context">
        <article>
          <p className={styles.kicker}>Source origin</p>
          <h2>{sourceContext.title}</h2>
          {sourceContext.canonical_url ? (
            <a href={sourceContext.canonical_url}>{sourceContext.canonical_url}</a>
          ) : null}
          <p>{sourceContext.summary}</p>
        </article>
        <article>
          <p className={styles.kicker}>User goal</p>
          <h2>{mission.mission_brief.user_goal}</h2>
          <p>{sourceContext.user_reason}</p>
        </article>
        <article>
          <p className={styles.kicker}>Next Session</p>
          <h2>{mission.active_session.title}</h2>
          <p>{mission.active_session.operation.prompt}</p>
        </article>
      </section>

      <section className={styles.mainGrid}>
        <div className={styles.queuePanel} aria-label="Focused Queue">
          <header className={styles.sectionHeader}>
            <div>
              <p className={styles.kicker}>Focused Queue</p>
              <h2>Now, next, later, locked</h2>
            </div>
            <p>{mission.focused_queue.rationale}</p>
          </header>

          <ol className={styles.queueList}>
            {queueSessions.map((session) => {
              const isSelected = session.id === state.selectedNodeId;
              const node = activeNodeForSession(session, projection.nodes);
              return (
                <li key={session.id} data-status={session.status}>
                  <button
                    type="button"
                    className={isSelected ? styles.queueButtonActive : styles.queueButton}
                    onClick={() => selectSession(session)}
                  >
                    <span>{queueLabel(session.status)}</span>
                    <strong>{session.title}</strong>
                    <em>{session.reason}</em>
                  </button>
                  {isSelected && node ? (
                    <div className={styles.sessionDetail}>
                      <p>{session.operation_label}</p>
                      <ul>
                        {node.miniNodes.map((miniNode) => (
                          <li key={miniNode.id}>{miniNode.name}</li>
                        ))}
                      </ul>
                      <button type="button" onClick={() => openSession(session)}>
                        Open Session
                        <span aria-hidden="true">-&gt;</span>
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>

        <aside className={styles.sidePanel}>
          <section aria-label="Tracks">
            <p className={styles.kicker}>Tracks</p>
            <div className={styles.trackList}>
              {mission.mission_brief.tracks.map((track) => (
                <article key={track.id}>
                  <span>{track.status}</span>
                  <strong>{track.title}</strong>
                  <p>{track.rationale}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-label="Expected artifacts">
            <p className={styles.kicker}>Expected Artifacts</p>
            <div className={styles.artifactList}>
              {mission.active_session.artifacts.map((artifact) => (
                <article key={artifact.id}>
                  <strong>{artifact.title}</strong>
                  <p>{artifact.purpose}</p>
                </article>
              ))}
            </div>
          </section>
        </aside>
      </section>

      <details className={styles.sourceMap}>
        <summary>Advanced Source Map</summary>
        <div className={styles.sourceMapGrid}>
          <section>
            <h2>Signals</h2>
            <ul>
              {mission.source_map.signals.map((signal) => (
                <li key={signal.id}>
                  <strong>{signal.label}</strong>
                  <span>{signal.kind} / {signal.confidence}</span>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2>Slices</h2>
            <ul>
              {mission.source_map.slices.map((slice) => (
                <li key={slice.id}>
                  <strong>{slice.label}</strong>
                  <span>{slice.excerpt_ref}</span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </details>
    </section>
  );
}
