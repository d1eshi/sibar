import styles from "./workspace.module.css";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

export function SessionWorkbench({ projection }: { projection: WorkspaceSessionProjection }) {
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

        <article className={styles.sourceWindow} aria-label="Learning material surface">
          <div className={styles.sourceWindowHeader}>
            <div>
              <p className={styles.kicker}>Learning material</p>
              <h3>{projection.selectedMaterial.title}</h3>
            </div>
            <span className={styles.sourceTypeBadge}>
              {projection.selectedMaterial.modeLabel}
            </span>
          </div>
          <p className={styles.materialBody}>{projection.selectedMaterial.content}</p>
          <footer className={styles.sourceLedger}>
            <span>{projection.selectedSource.metadata}</span>
            <strong>{projection.selectedMaterial.modeLabel} source</strong>
          </footer>
        </article>

        <article className={styles.outputContract}>
          <p className={styles.kicker}>Pedagogy status</p>
          <ul>
            <li>
              <strong>Recall follow-up</strong>
              <span>{projection.recallStatus}</span>
            </li>
            <li>
              <strong>Readiness</strong>
              <span>{projection.readinessLabel}</span>
            </li>
          </ul>
        </article>
      </section>
    </section>
  );
}
