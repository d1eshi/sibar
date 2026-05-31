import * as React from "react";
import readerStyles from "./workspace.module.css";
import styles from "./jaxSourcePage.module.css";
import {
  jaxThinkingInJaxScrapedAt,
  jaxThinkingInJaxSourceUrl,
  jaxThinkingInJaxSources,
} from "./jaxThinkingInJaxSource";
import type { WorkspaceSource } from "../../state/workspaceProjection";

type CapturedConfusion = {
  id: string;
  sourceRef: string;
  excerpt: string;
};

function sourceRefFor(source: WorkspaceSource, paragraphIndex: number): string {
  return `${source.id}#p-${paragraphIndex + 1}`;
}

export function JaxThinkingInJaxPage() {
  const [selectedSourceId, setSelectedSourceId] = React.useState(
    jaxThinkingInJaxSources[0]?.id ?? "",
  );
  const [activeSelection, setActiveSelection] =
    React.useState<CapturedConfusion | null>(null);
  const [confusions, setConfusions] = React.useState<CapturedConfusion[]>([]);
  const selectedSource =
    jaxThinkingInJaxSources.find((source) => source.id === selectedSourceId) ??
    jaxThinkingInJaxSources[0];

  function captureSelection(excerpt: string, sourceRef: string): void {
    setActiveSelection({
      id: `active:${sourceRef}`,
      sourceRef,
      excerpt,
    });
  }

  function markConfusing(): void {
    if (!activeSelection) {
      return;
    }

    setConfusions((current) => {
      if (current.some((entry) => entry.sourceRef === activeSelection.sourceRef)) {
        return current;
      }

      return [
        {
          ...activeSelection,
          id: `confusion:${activeSelection.sourceRef}`,
        },
        ...current,
      ];
    });
  }

  return (
    <main className={styles.sourceReaderPage} data-route="jax-thinking-in-jax">
      <section className={styles.readerShell} aria-label="JAX source reader">
        <aside className={styles.contextPanel} aria-label="JAX source context">
          <p className={readerStyles.kicker}>Concrete source route</p>
          <h1>JAX tutorials and Scaling Book first step</h1>
          <p>
            Scraped from the official JAX HTML and rendered here as selectable
            source evidence.
          </p>

          <dl>
            <div>
              <dt>Official source</dt>
              <dd>
                <a href={jaxThinkingInJaxSourceUrl} target="_blank" rel="noreferrer">
                  thinking_in_jax.html
                </a>
              </dd>
            </div>
            <div>
              <dt>Scraped</dt>
              <dd>{jaxThinkingInJaxScrapedAt}</dd>
            </div>
            <div>
              <dt>Route</dt>
              <dd>/jax/thinking-in-jax</dd>
            </div>
          </dl>
        </aside>

        <section className={readerStyles.readerWorkspace} aria-label="Scraped HTML reader">
          <aside className={readerStyles.materialTree} aria-label="Scraped source file tree">
            <p className={readerStyles.kicker}>File tree</p>
            <div className={readerStyles.materialTreeList}>
              {jaxThinkingInJaxSources.map((source) => (
                <button
                  key={source.id}
                  type="button"
                  className={
                    source.id === selectedSource.id
                      ? readerStyles.materialTreeItemActive
                      : readerStyles.materialTreeItem
                  }
                  onClick={() => setSelectedSourceId(source.id)}
                >
                  <span>{source.type}</span>
                  <strong>{source.title}</strong>
                  <em>{source.snippet}</em>
                </button>
              ))}
            </div>
          </aside>

          <main className={readerStyles.readerCanvas} aria-label="Selected JAX source section">
            <header className={readerStyles.readerHeader}>
              <div>
                <p className={readerStyles.kicker}>Scraped HTML section</p>
                <h2>{selectedSource.title}</h2>
                <p>{selectedSource.metadata}</p>
              </div>
              <span className={readerStyles.sourceTypeBadge}>{selectedSource.type}</span>
            </header>

            <article className={readerStyles.readerDocument} data-mode={selectedSource.type}>
              {selectedSource.body.map((paragraph, index) => {
                const sourceRef = sourceRefFor(selectedSource, index);

                return (
                  <p
                    key={sourceRef}
                    role="button"
                    tabIndex={0}
                    data-source-ref={sourceRef}
                    onClick={() => captureSelection(paragraph, sourceRef)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        captureSelection(paragraph, sourceRef);
                      }
                    }}
                  >
                    {paragraph}
                  </p>
                );
              })}
            </article>
          </main>
        </section>

        <aside className={styles.capturePanel} aria-label="Source evidence capture">
          <p className={readerStyles.kicker}>Selection capture</p>
          <h2>Esta parte no entiendo</h2>
          {activeSelection ? (
            <section className={styles.activeSelection}>
              <span>{activeSelection.sourceRef}</span>
              <p>{activeSelection.excerpt}</p>
              <button type="button" onClick={markConfusing}>
                Mark as confusing
              </button>
            </section>
          ) : (
            <p className={styles.emptySelection}>
              Select a paragraph in the reader to capture a source-backed question.
            </p>
          )}

          <section className={styles.captureList} aria-label="Captured confusing passages">
            <h3>Captured evidence</h3>
            {confusions.length === 0 ? (
              <p>No confusing passages captured yet.</p>
            ) : (
              confusions.map((entry) => (
                <article key={entry.id}>
                  <span>{entry.sourceRef}</span>
                  <p>{entry.excerpt}</p>
                </article>
              ))
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
