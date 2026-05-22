import styles from "./workspaceHome.module.css";
import type {
  WorkspaceHomeProjection,
  WorkspaceHomeWorkspace,
} from "../../state/workspaceProjection";

interface WorkspaceHomeProps {
  projection: WorkspaceHomeProjection;
  onNewWorkspace: () => void;
  onOpenWorkspace: (workspace: WorkspaceHomeWorkspace) => void;
}

export function WorkspaceHome({
  projection,
  onNewWorkspace,
  onOpenWorkspace,
}: WorkspaceHomeProps) {
  const pendingWorkspaces = projection.workspaces.filter(
    (workspace) => workspace.status === "active" || workspace.status === "ready",
  );

  return (
    <section className={styles.workspaceHome} aria-label="Workspace home">
      <header className={styles.homeHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>Workspace home</p>
          <h1>Continue your technical work</h1>
          <p>Pick up where you left off or open a workspace to continue learning.</p>
        </div>
        <button type="button" className={styles.newWorkspaceButton} onClick={onNewWorkspace}>
          <span aria-hidden="true">+</span>
          New workspace
        </button>
      </header>

      <section className={styles.workspacePanel}>
        <header className={styles.panelHeader}>
          <span className={styles.panelIcon} data-icon="clock" aria-hidden="true" />
          <div>
            <h2>Continue</h2>
            <p>Resume the last selected node or a ready study path.</p>
          </div>
        </header>
        {pendingWorkspaces.length === 0 ? (
          <p className={styles.emptyState}>No active pending sessions.</p>
        ) : (
          <div className={styles.continueList}>
            {pendingWorkspaces.map((workspace) => (
              <article key={workspace.id} className={styles.continueCard}>
                <div className={styles.cardTopline}>
                  <p className={styles.statusLabel}>
                    <span aria-hidden="true" />
                    {workspace.status === "active" ? "Active session" : "Ready to resume"}
                  </p>
                  <button type="button" onClick={() => onOpenWorkspace(workspace)}>
                    {workspace.status === "active" ? "Resume" : "Open"} session
                    <span aria-hidden="true">-&gt;</span>
                  </button>
                </div>
                <div className={styles.cardIntro}>
                  <h3>{workspace.title}</h3>
                  <p>{workspace.objective}</p>
                </div>
                <dl className={styles.continueDetails}>
                  <div>
                    <dt>Source boundary</dt>
                    <dd>{workspace.sourceBoundary}</dd>
                  </div>
                  <div>
                    <dt>Progress</dt>
                    <dd>{workspace.progress}</dd>
                  </div>
                  <div>
                    <dt>Next</dt>
                    <dd>{workspace.nextNode}</dd>
                  </div>
                  <div>
                    <dt>Last activity</dt>
                    <dd>{workspace.lastActivity}</dd>
                  </div>
                </dl>
                <div className={styles.readinessLine}>
                  <ReadinessMeter workspace={workspace} />
                  <p>
                    <strong>{workspace.readinessLevel} readiness</strong>
                    <span>{workspace.readinessHint}</span>
                  </p>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.workspacePanel}>
        <header className={styles.panelHeader}>
          <span className={styles.panelIcon} data-icon="folder" aria-hidden="true" />
          <div>
            <h2>Workspaces</h2>
            <p>Open a workspace to view your study path and sessions.</p>
          </div>
        </header>
        <div className={styles.workspaceList}>
          {projection.workspaces.map((workspace) => (
            <article key={workspace.id} className={styles.workspaceRow}>
              <span className={styles.workspaceIcon} data-icon={workspace.icon} aria-hidden="true" />
              <div className={styles.workspaceSummary}>
                <h3>{workspace.title}</h3>
                <p>{workspace.objective}</p>
                <dl className={styles.workspaceDetails}>
                  <div>
                    <dt>Source boundary</dt>
                    <dd>{workspace.sourceBoundary}</dd>
                  </div>
                  <div>
                    <dt>Progress</dt>
                    <dd>{workspace.progress}</dd>
                  </div>
                  <div>
                    <dt>Next node</dt>
                    <dd>{workspace.nextNode}</dd>
                  </div>
                </dl>
              </div>
              <div className={styles.rowReadiness}>
                <p className={styles.kicker}>Readiness</p>
                <ReadinessMeter workspace={workspace} />
              </div>
              <div className={styles.rowAction}>
                <button type="button" onClick={() => onOpenWorkspace(workspace)}>
                  {workspace.status === "active" ? "Resume" : "Open"}
                  <span aria-hidden="true">-&gt;</span>
                </button>
                <p>{workspace.status === "active" ? "Updated today" : `Updated ${workspace.lastActivity.toLowerCase()}`}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className={styles.homeFooter}>
        <p>
          <span className={styles.footerStatusIcon} aria-hidden="true" />
          Local workspace data
          <span className={styles.footerDivider} aria-hidden="true" />
          Synced
        </p>
        <button type="button">Settings</button>
      </footer>
    </section>
  );
}

function ReadinessMeter({ workspace }: { workspace: WorkspaceHomeWorkspace }) {
  return (
    <span className={styles.readinessMeter} aria-label={`${workspace.readinessPercent}% readiness`}>
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" />
        <circle
          cx="20"
          cy="20"
          r="16"
          pathLength={100}
          strokeDasharray={`${workspace.readinessPercent} ${100 - workspace.readinessPercent}`}
        />
      </svg>
      <strong>{workspace.readinessPercent}%</strong>
      <em>{workspace.readinessLevel}</em>
    </span>
  );
}
