import * as React from "react";
import readerStyles from "./workspace.module.css";
import styles from "./jaxSourcePage.module.css";
import {
  jaxThinkingInJaxHtml,
  jaxThinkingInJaxSections,
} from "./jaxThinkingInJaxSource";

type MarkKind = "highlight" | "question" | "key";

type CapturedConfusion = {
  id: string;
  sourceRef: string;
  kind: MarkKind;
  excerpt: string;
};

type PendingSelection = {
  id: string;
  sourceRef: string;
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

export function JaxThinkingInJaxPage() {
  const [selectedSectionId, setSelectedSectionId] = React.useState(
    jaxThinkingInJaxSections[0]?.id ?? "",
  );
  const [pendingSelection, setPendingSelection] = React.useState<PendingSelection | null>(null);
  const [pendingKind, setPendingKind] = React.useState<MarkKind>("highlight");
  const [confusions, setConfusions] = React.useState<CapturedConfusion[]>([]);
  const articleBodyRef = React.useRef<HTMLElement>(null);

  function clearPendingSelection(): void {
    setPendingSelection(null);
    setPendingKind("highlight");
    window.getSelection()?.removeAllRanges();
  }

  function scrollToSection(sectionId: string): void {
    setSelectedSectionId(sectionId);
    const article = articleBodyRef.current;
    const section = article?.querySelector(`#${sectionId}`) as HTMLElement | null;
    if (!article || !section) {
      return;
    }

    article.scrollTo({
      top: section.offsetTop - article.offsetTop - 8,
      behavior: "smooth",
    });
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
    const sourceElement = startNode?.closest?.("[data-source-ref]") as HTMLElement | null;
    const sectionElement = startNode?.closest?.("section[id]") as HTMLElement | null;
    const sourceRef =
      sourceElement?.dataset.sourceRef ??
      (sectionElement?.id ? `thinking-in-jax#${sectionElement.id}` : "thinking-in-jax#selection");

    setPendingSelection({
      id: `pending:${sourceRef}`,
      sourceRef,
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

  return (
    <main className={styles.sourceReaderPage} data-route="jax-thinking-in-jax">
      <section className={styles.readerShell} aria-label="JAX source reader">
        <section
          className={`${readerStyles.readerWorkspace} ${styles.htmlReaderWorkspace}`}
          aria-label="Scraped HTML reader"
        >
          <aside className={styles.playbookTree} aria-label="JAX 101 playbook file tree">
            <section className={styles.treeGroup} aria-label="Getting started">
              <h2>Getting started</h2>
              <button type="button" className={styles.treeLink}>
                Installation
              </button>
              <button
                type="button"
                className={styles.treeLinkActive}
                onClick={() => scrollToSection("quickstart-how-to-think-in-jax")}
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
                {jaxThinkingInJaxSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    className={
                      section.id === selectedSectionId
                        ? `${styles.treeSectionActive} ${styles[`treeSectionLevel${section.level}`]}`
                        : `${styles.treeSection} ${styles[`treeSectionLevel${section.level}`]}`
                    }
                    onClick={() => scrollToSection(section.id)}
                  >
                    <strong>{section.title}</strong>
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

          <main
            className={`${readerStyles.readerCanvas} ${styles.htmlReaderCanvas}`}
            aria-label="Selected JAX source section"
          >
            <article
              ref={articleBodyRef}
              className={`${readerStyles.readerDocument} ${styles.jaxReaderDocument} ${styles.scrapedHtmlDocument}`}
              data-mode="scraped-html"
              data-source-ref="thinking-in-jax#document"
              onMouseUp={() => window.setTimeout(handleParagraphSelection, 0)}
              dangerouslySetInnerHTML={{ __html: jaxThinkingInJaxHtml }}
            />
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
            {confusions.length === 0 ? (
              <p>No confusing passages captured yet.</p>
            ) : (
              confusions.map((entry) => (
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
