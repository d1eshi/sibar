import * as React from "react";
import readerStyles from "./workspace.module.css";
import styles from "./jaxSourcePage.module.css";
import {
  jaxThinkingInJaxHtml,
  jaxThinkingInJaxSections,
} from "./jaxThinkingInJaxSource";

type MarkKind = "highlight" | "question" | "key";

type SourceAnnotation = {
  id: string;
  sourceRef: string;
  kind: MarkKind;
  excerpt: string;
  note: string;
  llmPayload: AnnotationLlmPayload;
};

type PendingSelection = {
  id: string;
  sourceRef: string;
  excerpt: string;
};

type AnnotationLlmPayload = {
  route: "/jax/thinking-in-jax";
  sourceRef: string;
  selectedText: string;
  userNote: string;
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
  const [pendingNote, setPendingNote] = React.useState("");
  const [annotations, setAnnotations] = React.useState<SourceAnnotation[]>([]);
  const articleBodyRef = React.useRef<HTMLElement>(null);

  function clearPendingSelection(): void {
    setPendingSelection(null);
    setPendingNote("");
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
    setPendingNote("");
  }

  function sendAnnotationToLlm(): void {
    if (!pendingSelection) {
      return;
    }

    const note = pendingNote.trim();
    if (note.length === 0) {
      return;
    }

    if (
      annotations.some(
        (entry) =>
          entry.sourceRef === pendingSelection.sourceRef &&
          entry.excerpt === pendingSelection.excerpt &&
          entry.note === note,
      )
    ) {
      clearPendingSelection();
      return;
    }

    setAnnotations((current) => {
      return [
        {
          ...pendingSelection,
          kind: "question",
          note,
          llmPayload: {
            route: "/jax/thinking-in-jax",
            sourceRef: pendingSelection.sourceRef,
            selectedText: pendingSelection.excerpt,
            userNote: note,
          },
          id: `annotation:${pendingSelection.sourceRef}:${pendingSelection.excerpt}:${note}`,
        },
        ...current,
      ];
    });
    clearPendingSelection();
  }

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (!pendingSelection) {
        return;
      }

      if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        sendAnnotationToLlm();
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
  }, [pendingSelection, pendingNote, sendAnnotationToLlm, clearPendingSelection]);

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
              <label className={styles.annotationComposer}>
                <span>Duda o nota para el LLM</span>
                <textarea
                  rows={5}
                  value={pendingNote}
                  placeholder="Escribi una duda concreta sobre esta seleccion..."
                  onChange={(event) => setPendingNote(event.currentTarget.value)}
                />
              </label>
              <div className={styles.selectionActions}>
                <button
                  type="button"
                  onClick={sendAnnotationToLlm}
                  disabled={pendingNote.trim().length === 0}
                >
                  Enviar al LLM
                </button>
                <button type="button" onClick={clearPendingSelection}>
                  Limpiar selección
                </button>
              </div>
            </section>
          ) : (
            <p className={styles.emptySelection}>
              Seleccioná texto en el artículo para escribir una duda o nota y dejarla como annotation.
            </p>
          )}

          <section className={styles.captureList} aria-label="Annotation chat">
            <h3>Annotations</h3>
            {annotations.length === 0 ? (
              <p>No hay annotations todavía.</p>
            ) : (
              annotations.map((entry) => (
                <article key={entry.id} className={styles.evidenceItem}>
                  <span className={`${styles.evidenceKind} ${KIND_STYLES[entry.kind]}`}>
                    LLM annotation
                  </span>
                  <span>{entry.sourceRef}</span>
                  <p>
                    <mark className={`${styles.atomicHighlight} ${KIND_STYLES[entry.kind]}`}>
                      {entry.excerpt}
                    </mark>
                  </p>
                  <div className={styles.chatBubble}>
                    <span>Vos</span>
                    <p>{entry.note}</p>
                  </div>
                  <div className={styles.chatBubbleAssistant}>
                    <span>LLM</span>
                    <p>Annotation lista para discutir con el modelo usando solo esta selección.</p>
                  </div>
                </article>
              ))
            )}
          </section>
        </aside>
      </section>
    </main>
  );
}
