import * as React from "react";
import readerStyles from "./workspace.module.css";
import styles from "./jaxSourcePage.module.css";
import {
  jaxThinkingInJaxScrapedAt,
  jaxThinkingInJaxSourceUrl,
  jaxThinkingInJaxSources,
} from "./jaxThinkingInJaxSource";
import type { WorkspaceSource } from "../../state/workspaceProjection";

type MarkKind = "highlight" | "question" | "key";

type CapturedConfusion = {
  id: string;
  sourceId: string;
  sourceRef: string;
  paragraphIndex: number;
  kind: MarkKind;
  excerpt: string;
};

type PendingSelection = {
  id: string;
  sourceId: string;
  sourceRef: string;
  paragraphIndex: number;
  excerpt: string;
};

const KIND_ORDER: MarkKind[] = ["highlight", "question", "key"];
const KIND_LABELS: Record<MarkKind, string> = {
  highlight: "Highlight",
  question: "Pregunta",
  key: "Idea",
};

const KIND_STYLES: Record<MarkKind, string> = {
  highlight: styles.kindHighlight,
  question: styles.kindQuestion,
  key: styles.kindKey,
};

const jax101ReferenceItems = [
  "Key concepts",
  "Resources and Advanced Guides",
  "API Reference",
  "Developer notes",
  "Extension guides",
  "Notes",
  "Pallas: a JAX kernel language",
  "About the project",
  "Frequently asked questions (FAQ)",
  "Change log",
  "Glossary of terms",
  "Configuration Options",
];

function sourceRefFor(source: WorkspaceSource, paragraphIndex: number): string {
  return `${source.id}#p-${paragraphIndex + 1}`;
}

type MarkRange = {
  id: string;
  start: number;
  end: number;
  kind: MarkKind;
};

function rangesForParagraph(
  paragraph: string,
  index: number,
  notes: readonly CapturedConfusion[],
): MarkRange[] {
  const paragraphNotes = notes
    .filter((note) => note.paragraphIndex === index)
    .sort((a, b) => b.excerpt.length - a.excerpt.length);

  const ranges: MarkRange[] = [];

  for (const note of paragraphNotes) {
    const start = paragraph.indexOf(note.excerpt);
    const end = start + note.excerpt.length;

    if (start < 0) {
      continue;
    }

    if (ranges.some((range) => start < range.end && end > range.start)) {
      continue;
    }

    ranges.push({
      id: note.id,
      start,
      end,
      kind: note.kind,
    });
  }

  return ranges.sort((a, b) => a.start - b.start);
}

function renderParagraph(paragraph: string, index: number, notes: readonly CapturedConfusion[]): React.ReactNode[] {
  const ranges = rangesForParagraph(paragraph, index, notes);

  if (ranges.length === 0) {
    return [paragraph];
  }

  const parts: React.ReactNode[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push(paragraph.slice(cursor, range.start));
    }

    parts.push(
      <mark
        key={`${range.id}-${range.start}-${range.end}`}
        className={`${styles.atomicHighlight} ${KIND_STYLES[range.kind]}`}
        data-note-id={range.id}
      >
        {paragraph.slice(range.start, range.end)}
      </mark>,
    );

    cursor = range.end;
  }

  if (cursor < paragraph.length) {
    parts.push(paragraph.slice(cursor));
  }

  return parts;
}

export function JaxThinkingInJaxPage() {
  const [selectedSourceId, setSelectedSourceId] = React.useState(
    jaxThinkingInJaxSources[0]?.id ?? "",
  );
  const [pendingSelection, setPendingSelection] = React.useState<PendingSelection | null>(null);
  const [pendingKind, setPendingKind] = React.useState<MarkKind>("highlight");
  const [confusions, setConfusions] = React.useState<CapturedConfusion[]>([]);
  const selectedSource =
    jaxThinkingInJaxSources.find((source) => source.id === selectedSourceId) ??
    jaxThinkingInJaxSources[0];
  const articleBodyRef = React.useRef<HTMLElement>(null);

  const sourceConfusions = React.useMemo(
    () => confusions.filter((entry) => entry.sourceId === selectedSource.id),
    [confusions, selectedSource.id],
  );

  function clearPendingSelection(): void {
    setPendingSelection(null);
    setPendingKind("highlight");
    window.getSelection()?.removeAllRanges();
  }

  function handleParagraphSelection(): void {
    const selection = window.getSelection();
    if (!selection || !articleBodyRef.current) {
      clearPendingSelection();
      return;
    }

    if (selection.isCollapsed || selection.rangeCount === 0) {
      clearPendingSelection();
      return;
    }

    const range = selection.getRangeAt(0);
    if (!articleBodyRef.current.contains(range.commonAncestorContainer)) {
      clearPendingSelection();
      return;
    }

    const selectedText = selection
      .toString()
      .trim()
      .replace(/\s+/g, " ");
    if (!selectedText) {
      clearPendingSelection();
      return;
    }

    const startNode =
      range.startContainer.nodeType === Node.TEXT_NODE
        ? range.startContainer.parentElement
        : range.startContainer;
    const paragraph = startNode?.closest?.("[data-paragraph-index]") as HTMLElement | null;
    if (!paragraph) {
      clearPendingSelection();
      return;
    }

    const paragraphIndex = Number(paragraph.dataset.paragraphIndex);
    if (Number.isNaN(paragraphIndex)) {
      clearPendingSelection();
      return;
    }

    const sourceRef = sourceRefFor(selectedSource, paragraphIndex);
    setPendingSelection({
      id: `pending:${sourceRef}`,
      sourceId: selectedSource.id,
      sourceRef,
      paragraphIndex,
      excerpt: selectedText,
    });
    setPendingKind("highlight");
  }

  function setSelectionKind(kind: MarkKind): void {
    setPendingKind(kind);
  }

  function saveSelection(): void {
    if (!pendingSelection) {
      return;
    }

    if (
      confusions.some(
        (entry) =>
          entry.sourceId === selectedSource.id &&
          entry.sourceRef === pendingSelection.sourceRef &&
          entry.excerpt === pendingSelection.excerpt &&
          entry.kind === pendingKind,
      )
    ) {
      clearPendingSelection();
      return;
    }

    setConfusions((current) => {
      return [
        {
          ...pendingSelection,
          kind: pendingKind,
          id: `confusion:${pendingSelection.sourceRef}:${pendingSelection.excerpt}`,
        },
        ...current,
      ];
    });
    clearPendingSelection();
  }

  function cycleKind(direction: number): void {
    const index = KIND_ORDER.indexOf(pendingKind);
    const nextIndex = (index + direction + KIND_ORDER.length) % KIND_ORDER.length;
    setPendingKind(KIND_ORDER[nextIndex]);
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (!pendingSelection) {
        return;
      }

      if (event.key === "Tab") {
        event.preventDefault();
        cycleKind(event.shiftKey ? -1 : 1);
        return;
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        saveSelection();
        return;
      }

      if (event.key === "Escape") {
        clearPendingSelection();
        return;
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [pendingSelection, pendingKind, saveSelection, clearPendingSelection, cycleKind]);

  React.useEffect(() => {
    clearPendingSelection();
  }, [selectedSource.id]);

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
          <aside className={styles.playbookTree} aria-label="JAX 101 playbook file tree">
            <section className={styles.treeGroup} aria-label="Getting started">
              <h2>Getting started</h2>
              <button type="button" className={styles.treeLink}>
                Installation
              </button>
              <button
                type="button"
                className={styles.treeLinkActive}
                onClick={() => setSelectedSourceId("thinking-in-jax-overview")}
              >
                Quickstart: How to think in JAX
              </button>
              <button type="button" className={styles.treeLink}>
                🔪 JAX - The Sharp Bits 🔪
              </button>
            </section>

            <section className={styles.treeGroup} aria-label="JAX 101 page sections">
              <h2>JAX 101</h2>
              <div className={styles.treeSourceList}>
                {jaxThinkingInJaxSources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    className={
                      source.id === selectedSource.id
                        ? styles.treeSectionActive
                        : styles.treeSection
                    }
                    onClick={() => setSelectedSourceId(source.id)}
                  >
                    <strong>{source.title}</strong>
                  </button>
                ))}
              </div>
            </section>

            <section className={styles.treeGroup} aria-label="Resources guides and references">
              <h2>Resources, guides, and references</h2>
              <div className={styles.treeSourceList}>
                {jax101ReferenceItems.map((item) => (
                  <button key={item} type="button" className={styles.treeLink}>
                    {item}
                  </button>
                ))}
              </div>
            </section>
          </aside>

          <main className={readerStyles.readerCanvas} aria-label="Selected JAX source section">
            <header className={readerStyles.readerHeader}>
              <div>
                <p className={readerStyles.kicker}>Scraped HTML section</p>
                <h2>{selectedSource.title}</h2>
                <p>{selectedSource.metadata}</p>
              </div>
            </header>

            <article
              ref={articleBodyRef}
              className={`${readerStyles.readerDocument} ${styles.jaxReaderDocument}`}
              data-mode={selectedSource.type}
              onMouseUp={() => window.setTimeout(handleParagraphSelection, 0)}
            >
              {selectedSource.body.map((paragraph, index) => {
                const sourceRef = sourceRefFor(selectedSource, index);

                return (
                  <p key={sourceRef} data-paragraph-index={index} data-source-ref={sourceRef}>
                    {renderParagraph(paragraph, index, sourceConfusions).map((chunk, chunkIndex) => (
                      <React.Fragment key={`${sourceRef}-${chunkIndex}`}>{chunk}</React.Fragment>
                    ))}
                  </p>
                );
              })}
            </article>
          </main>
        </section>

        <aside className={styles.capturePanel} aria-label="Source evidence capture">
          <p className={readerStyles.kicker}>Selection capture</p>
          <h2>Esta parte no entiendo</h2>
          {pendingSelection ? (
            <section className={styles.activeSelection}>
              <span>{pendingSelection.sourceRef}</span>
              <p>{pendingSelection.excerpt}</p>
              <div className={styles.selectionKind}>
                {KIND_ORDER.map((kind) => (
                  <button
                    type="button"
                    key={kind}
                    className={`${styles.kindButton} ${pendingKind === kind ? styles.kindButtonActive : ""}`}
                    onClick={() => setSelectionKind(kind)}
                  >
                    {KIND_LABELS[kind]}
                  </button>
                ))}
              </div>
              <div className={styles.selectionActions}>
                <button type="button" onClick={saveSelection}>
                  Guardar evidencia ({KIND_LABELS[pendingKind]})
                </button>
                <button type="button" onClick={clearPendingSelection}>
                  Limpiar selección
                </button>
              </div>
            </section>
          ) : (
            <p className={styles.emptySelection}>
              Seleccioná texto en el artículo para marcar highlight, pregunta o idea y guardar evidencia.
            </p>
          )}

          <section className={styles.captureList} aria-label="Captured confusing passages">
            <h3>Captured evidence</h3>
            {sourceConfusions.length === 0 ? (
              <p>No confusing passages captured yet.</p>
            ) : (
              sourceConfusions.map((entry) => (
                <article key={entry.id} className={styles.evidenceItem}>
                  <span className={`${styles.evidenceKind} ${KIND_STYLES[entry.kind]}`}>
                    {KIND_LABELS[entry.kind]}
                  </span>
                  <span>{entry.sourceRef}</span>
                  <p>
                    <mark className={`${styles.atomicHighlight} ${KIND_STYLES[entry.kind]}`}>
                      {entry.excerpt}
                    </mark>
                  </p>
                </article>
              ))
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
