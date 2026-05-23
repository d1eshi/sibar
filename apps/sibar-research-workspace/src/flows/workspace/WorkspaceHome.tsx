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
    <section className={styles.workspaceHome} aria-label="Mission home">
      <header className={styles.homeHeader}>
        <div className={styles.headerCopy}>
          <p className={styles.kicker}>Mission home</p>
          <h1>Continue the frontier-lab mission</h1>
          <p>Open the source-backed Mission Brief before entering an active Session.</p>
        </div>
        <button type="button" className={styles.newWorkspaceButton} onClick={onNewWorkspace}>
          <span aria-hidden="true">+</span>
          New mission
        </button>
      </header>

      <section className={styles.workspacePanel}>
        <header className={styles.panelHeader}>
          <span className={styles.panelIcon} data-icon="clock" aria-hidden="true" />
          <div>
            <h2>Continue</h2>
            <p>Open the Mission Brief and focused queue for the blog-derived path.</p>
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
                    {workspace.status === "active" ? "Active Mission" : "Ready to review"}
                  </p>
                  <button type="button" onClick={() => onOpenWorkspace(workspace)}>
                    {workspace.status === "active" ? "Open" : "View"} Mission Brief
                    <span aria-hidden="true">-&gt;</span>
                  </button>
                </div>
                <div className={styles.cardIntro}>
                  <h3>{workspace.title}</h3>
                  <p>{workspace.objective}</p>
                  {workspace.sourceOriginUrl ? (
                    <a href={workspace.sourceOriginUrl}>{workspace.sourceOriginUrl}</a>
                  ) : null}
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
                    <dt>Why</dt>
                    <dd>{workspace.whyMissionExists}</dd>
                  </div>
                </dl>
                <div className={styles.readinessLine}>
                  <ReviewConfidenceMeter workspace={workspace} />
                  <p>
                    <strong>{workspace.reviewConfidenceLevel} source review</strong>
                    <span>{workspace.reviewConfidenceHint}</span>
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
            <h2>Missions</h2>
            <p>Mission, Track, Session, and Artifact are the primary surfaces.</p>
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
                    <dt>Source origin</dt>
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
                <p className={styles.kicker}>Source confidence</p>
                <ReviewConfidenceMeter workspace={workspace} />
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
          Local mission data
          <span className={styles.footerDivider} aria-hidden="true" />
          Synced
        </p>
        <button type="button">Settings</button>
      </footer>
    </section>
  );
}

function ReviewConfidenceMeter({ workspace }: { workspace: WorkspaceHomeWorkspace }) {
  return (
    <span
      className={styles.readinessMeter}
      aria-label={`${workspace.reviewConfidencePercent}% source confidence`}
    >
      <svg viewBox="0 0 40 40" aria-hidden="true">
        <circle cx="20" cy="20" r="16" />
        <circle
          cx="20"
          cy="20"
          r="16"
          pathLength={100}
          strokeDasharray={`${workspace.reviewConfidencePercent} ${100 - workspace.reviewConfidencePercent}`}
        />
      </svg>
      <strong>{workspace.reviewConfidencePercent}%</strong>
      <em>{workspace.reviewConfidenceLevel}</em>
    </span>
  );
}
