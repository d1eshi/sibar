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
        <p className={styles.kicker}>Workspace home</p>
        <div className={styles.headerCopy}>
          <h1>Continue where you left off</h1>
          <p>
            Existing workspaces and pending sessions stay visible. Open one to resume
            learning, or create a new workspace.
          </p>
        </div>
        <button type="button" className={styles.newWorkspaceButton} onClick={onNewWorkspace}>
          New workspace
        </button>
      </header>

      <section className={styles.workspacePanel}>
        <header>
          <h2>Pending sessions</h2>
          <p>Resume from the last selected node or open a ready study path.</p>
        </header>
        {pendingWorkspaces.length === 0 ? (
          <p className={styles.emptyState}>No active pending sessions.</p>
        ) : (
          <div className={styles.homeList}>
            {pendingWorkspaces.map((workspace) => (
              <article key={workspace.id} className={styles.workspaceCard}>
                <p className={styles.kicker}>{workspace.status === "active" ? "Active" : "Ready"}</p>
                <h3>{workspace.title}</h3>
                <p>{workspace.objective}</p>
                <dl className={styles.workspaceDetails}>
                  <div>
                    <dt>Boundary</dt>
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
                </dl>
                <p className={styles.readinessHint}>{workspace.readinessHint}</p>
                <button type="button" onClick={() => onOpenWorkspace(workspace)}>
                  {workspace.status === "active" ? "Resume" : "Open"} session
                </button>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className={styles.workspacePanel}>
        <header>
          <h2>Existing workspaces</h2>
          <p>RAG, JAX, and Embeddings-style sessions are available.</p>
        </header>
        <div className={styles.homeList}>
          {projection.workspaces.map((workspace) => (
            <article key={workspace.id} className={styles.workspaceCard}>
              <p className={styles.kicker}>
                {workspace.status === "draft"
                  ? "Draft"
                  : workspace.status === "blocked"
                    ? "Blocked"
                    : "Workspace"}
              </p>
              <h3>{workspace.title}</h3>
              <p>{workspace.objective}</p>
              <dl className={styles.workspaceDetails}>
                <div>
                  <dt>Boundary</dt>
                  <dd>{workspace.sourceBoundary}</dd>
                </div>
                <div>
                  <dt>Progress</dt>
                  <dd>{workspace.progress}</dd>
                </div>
                <div>
                  <dt>Readiness</dt>
                  <dd>{workspace.readinessHint}</dd>
                </div>
              </dl>
              <button type="button" onClick={() => onOpenWorkspace(workspace)}>
                {workspace.status === "active" ? "Resume" : "Open"}
              </button>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
