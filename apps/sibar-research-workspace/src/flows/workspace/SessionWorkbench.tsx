import styles from "./workspace.module.css";
import type { WorkspaceSessionProjection } from "../../state/workspaceProjection";

export function SessionWorkbench({
  projection,
  onSelectSource,
}: {
  projection: WorkspaceSessionProjection;
  onSelectSource: (sourceId: string) => void;
}) {
  const isCodeMaterial = projection.selectedMaterial.mode === "code";
  const isEquationMaterial =
    projection.selectedMaterial.mode === "equation" ||
    projection.selectedMaterial.mode === "math";

  return (
    <section className={styles.sessionWorkbench} aria-label="Session workbench">
      <header className={styles.sessionHeader}>
        <div>
          <p className={styles.kicker}>Active node reader</p>
          <h1>{projection.selectedNode.sessionTitle}</h1>
          <p>{projection.selectedMiniNode.question}</p>
        </div>
        <span className={styles.sessionMark} aria-hidden="true" />
      </header>

      <section className={styles.readerWorkspace} aria-label="Learning material reader">
        <aside className={styles.materialTree} aria-label="Learning material selection">
          <p className={styles.kicker}>Materials</p>
          <div className={styles.materialTreeList}>
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
                <em>{source.metadata}</em>
              </button>
            ))}
          </div>
        </aside>

        <main className={styles.readerCanvas} aria-label="Selected learning material">
          <header className={styles.readerHeader}>
            <div>
              <p className={styles.kicker}>{projection.selectedMaterial.modeLabel}</p>
              <h2>{projection.selectedMaterial.title}</h2>
              <p>{projection.selectedSource.metadata}</p>
            </div>
            <span className={styles.sourceTypeBadge}>
              {projection.selectedMaterial.modeLabel}
            </span>
          </header>

          <article
            className={styles.readerDocument}
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
              projection.selectedMaterial.content.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))
            )}
          </article>
        </main>
      </section>
    </section>
  );
}
