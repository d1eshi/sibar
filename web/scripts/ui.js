export const KIND_ORDER = ["highlight", "question", "key"];

export function getElements() {
  const $ = (id) => document.getElementById(id);
  return {
    form: $("loadForm"),
    startView: $("startView"),
    loadingView: $("loadingView"),
    readerView: $("readerView"),
    recentSources: $("recentSources"),
    urlInput: $("urlInput"),
    sampleBtn: $("sampleBtn"),
    emptySampleBtn: $("emptySampleBtn"),
    emptyState: $("emptyState"),
    article: $("article"),
    hostLabel: $("hostLabel"),
    paragraphCount: $("paragraphCount"),
    articleTitle: $("articleTitle"),
    articleBody: $("articleBody"),
    selectionToolbar: $("selectionToolbar"),
    selectionCard: $("selectionCard"),
    selectionText: $("selectionText"),
    selectionNote: $("selectionNote"),
    saveSelectionBtn: $("saveSelectionBtn"),
    clearSelectionBtn: $("clearSelectionBtn"),
    looseNote: $("looseNote"),
    saveLooseBtn: $("saveLooseBtn"),
    notes: $("notes"),
    noteCount: $("noteCount"),
    savedChip: $("savedChip"),
    savedToast: $("savedToast"),
    savedDrawer: $("savedDrawer"),
    closeSavedBtn: $("closeSavedBtn"),
    historyCount: $("historyCount"),
    historyList: $("historyList"),
    status: $("status")
  };
}

export function escapeHtml(value) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[char]);
}

function rangesForParagraph(paragraph, index, notes) {
  const ranges = [];
  const paragraphNotes = notes
    .filter((note) => note.paragraphIndex === index && note.selectedText)
    .sort((a, b) => b.selectedText.length - a.selectedText.length);

  for (const note of paragraphNotes) {
    const start = paragraph.indexOf(note.selectedText);
    const end = start + note.selectedText.length;
    if (start < 0 || ranges.some((range) => start < range.end && end > range.start)) continue;
    ranges.push({ start, end, kind: note.kind, id: note.id });
  }

  return ranges.sort((a, b) => a.start - b.start);
}

function renderParagraph(paragraph, index, notes) {
  const ranges = rangesForParagraph(paragraph, index, notes);
  if (ranges.length === 0) return escapeHtml(paragraph);

  let html = "";
  let cursor = 0;
  for (const range of ranges) {
    html += escapeHtml(paragraph.slice(cursor, range.start));
    html += `<mark class="atomic-highlight kind-${range.kind}" data-note-id="${range.id}">${escapeHtml(paragraph.slice(range.start, range.end))}</mark>`;
    cursor = range.end;
  }
  html += escapeHtml(paragraph.slice(cursor));
  return html;
}

export function renderArticle(elements, state) {
  const article = state.article;
  if (elements.emptyState) elements.emptyState.hidden = Boolean(article);
  if (elements.article) elements.article.hidden = !article;
  if (!article) return;

  elements.hostLabel.textContent = article.host;
  elements.paragraphCount.textContent = `${article.paragraphs.length} bloques`;
  elements.articleTitle.textContent = article.title;
  elements.articleBody.innerHTML = article.paragraphs
    .map((paragraph, index) => `<p data-paragraph-index="${index}">${renderParagraph(paragraph, index, state.notes)}</p>`)
    .join("");
}

export function kindLabel(kind) {
  if (kind === "question") return "Pregunta";
  if (kind === "key") return "Idea";
  return "Highlight";
}

export function renderNotes(elements, state) {
  if (elements.noteCount) elements.noteCount.textContent = `${state.notes.length} notas`;
  if (elements.savedChip) {
    const count = state.notes.length;
    elements.savedChip.hidden = count === 0;
    elements.savedChip.textContent = `${count} ${count === 1 ? "guardada" : "guardadas"}`;
  }
  elements.notes.innerHTML = state.notes.map((note) => `
    <article class="note">
      <div class="note-head">
        <span class="note-kind ${note.kind}">${kindLabel(note.kind)}</span>
        <time>${new Date(note.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</time>
      </div>
      ${note.selectedText ? `<blockquote>${escapeHtml(note.selectedText)}</blockquote>` : ""}
      ${note.note ? `<p>${escapeHtml(note.note)}</p>` : ""}
    </article>
  `).join("");
}

export function renderHistory(elements, history, activeUrl) {
  elements.historyCount.textContent = String(history.length);
  if (elements.recentSources) elements.recentSources.hidden = history.length === 0;
  if (history.length === 0) {
    elements.historyList.innerHTML = "";
    return;
  }

  elements.historyList.innerHTML = history.map((item) => `
    <button class="history-item${activeUrl === item.url ? " active" : ""}" type="button" data-history-url="${escapeHtml(item.url)}">
      <span class="history-item-title">${escapeHtml(item.title)}</span>
      <span class="history-item-meta">
        <span>${escapeHtml(item.host)}</span>
        <span>${item.noteCount || 0} notas</span>
      </span>
    </button>
  `).join("");
}

export function renderPending(elements, pendingSelection, pendingKind) {
  elements.selectionCard.hidden = !pendingSelection;
  if (!pendingSelection) return;
  elements.selectionCard.dataset.activeKind = pendingKind;
  elements.selectionText.textContent = pendingSelection.selectedText;
  document.querySelectorAll(".kind-btn").forEach((button) => {
    const active = button.dataset.kind === pendingKind;
    button.classList.toggle("active", active);
    button.setAttribute("aria-selected", active ? "true" : "false");
  });
}

export function setStatus(elements, message) {
  elements.status.textContent = message;
  elements.status.classList.remove("flash");
}

export function flashStatus(elements, message) {
  elements.status.textContent = message;
  elements.status.classList.remove("flash");
  void elements.status.offsetWidth;
  elements.status.classList.add("flash");
}

export function positionToolbar(elements) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
    elements.selectionToolbar.classList.remove("visible");
    return;
  }
  const range = selection.getRangeAt(0);
  if (!elements.articleBody.contains(range.commonAncestorContainer)) return;
  const rect = range.getBoundingClientRect();
  elements.selectionToolbar.style.left = `${window.scrollX + rect.left + rect.width / 2 - 112}px`;
  elements.selectionToolbar.style.top = `${window.scrollY + rect.top - 46}px`;
  elements.selectionToolbar.classList.add("visible");
}

export function positionSelectionCard(elements) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  const rect = range.getBoundingClientRect();
  elements.selectionCard.style.left = `${Math.min(window.innerWidth - 330, Math.max(16, rect.left + rect.width / 2 - 156))}px`;
  elements.selectionCard.style.top = `${window.scrollY + rect.bottom + 14}px`;
}
