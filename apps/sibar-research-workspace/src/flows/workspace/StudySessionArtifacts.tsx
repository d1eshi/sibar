import styles from "./workspace.module.css";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

interface StudySessionArtifactsProps {
  projection: WorkspaceSessionProjection;
  isReadinessPanelVisible: boolean;
  onSelectSource: (sourceId: string) => void;
  onToggleReadiness: () => void;
}

export function StudySessionArtifacts({
  projection,
  isReadinessPanelVisible,
  onSelectSource,
  onToggleReadiness,
}: StudySessionArtifactsProps) {
  const isCodeMaterial = projection.selectedMaterial.mode === "code";
  const isEquationMaterial =
    projection.selectedMaterial.mode === "equation" ||
    projection.selectedMaterial.mode === "math";

  return (
    <aside className={styles.readinessPanel} aria-label="Study session artifacts">
      <section className={styles.artifactPanel}>
        <header className={styles.artifactHeader}>
          <div>
            <p className={styles.kicker}>Artifacts</p>
            <h3>{projection.selectedSource.title}</h3>
            <p>{projection.selectedSource.metadata}</p>
          </div>
          <span className={styles.sourceTypeBadge}>
            {projection.selectedMaterial.modeLabel}
          </span>
        </header>

        <div className={styles.materialTreeList} aria-label="Source context">
          {projection.sources.map((source) => (
            <button
              key={source.id}
              type="button"
              className={
                source.id === projection.selectedSource.id
                  ? styles.materialTreeItemActive
                  : styles.materialTreeItem
              }
              onClick={() => onSelectSource(source.id)}
            >
              <span>{source.type}</span>
              <strong>{source.title}</strong>
              <em>{source.snippet}</em>
            </button>
          ))}
        </div>

        <article
          className={styles.artifactDocument}
          data-mode={projection.selectedMaterial.mode}
        >
          {isCodeMaterial ? (
            <pre className={styles.codeMaterial}>
              <code>{projection.selectedMaterial.content.join("\n")}</code>
            </pre>
          ) : isEquationMaterial ? (
            <div className={styles.equationMaterial}>
              {projection.selectedMaterial.content.map((line, index) => (
                <p key={line}>
                  <span>{index + 1}</span>
                  {line}
                </p>
              ))}
            </div>
          ) : (
            projection.selectedMaterial.content.slice(0, 2).map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))
          )}
        </article>
      </section>

      {isReadinessPanelVisible ? (
        <section className={styles.guidePanel}>
          <p className={styles.kicker}>Guide / readiness</p>
          <h3>{projection.selectedMiniNode.name}</h3>
          <p>{projection.sessionHint}</p>
          <ul>
            <li>One concrete artifact from the current mini-node.</li>
            <li>One evidence-backed conclusion.</li>
            <li>{projection.recallStatus}</li>
            <li>{projection.readinessLabel}</li>
          </ul>
          <button
            type="button"
            className={styles.panelToggle}
            onClick={onToggleReadiness}
          >
            Hide compact panel
          </button>
        </section>
      ) : (
        <section className={styles.guidePanel}>
          <p className={styles.kicker}>Guide / readiness</p>
          <button
            type="button"
            className={styles.panelShow}
            onClick={onToggleReadiness}
          >
            Show compact panel
          </button>
        </section>
      )}
    </aside>
  );
}
