import { fetchReadableArticle, normalizeArticleUrl } from "./api.js";
import { sampleArticle } from "./sample-article.js";
import {
  getSavedWorkspaceByUrl,
  loadHistory,
  loadWorkspaceStore,
  nextHistory,
  saveJson,
  saveWorkspaceStore,
  HISTORY_KEY,
  workspaceKey
} from "./storage.js";
import {
  flashStatus,
  getElements,
  KIND_ORDER,
  positionToolbar,
  renderArticle,
  renderHistory,
  renderNotes,
  renderPending,
  setStatus
} from "./ui.js";

const MAX_SESSION_NOTES = 12;

const elements = getElements();
let state = { article: null, notes: [] };
let sessionHistory = loadHistory();
let pendingSelection = null;
let pendingKind = "highlight";

function render() {
  renderArticle(elements, state);
  renderNotes(elements, state);
  renderHistory(elements, sessionHistory, state.article?.url);
  renderPending(elements, pendingSelection, pendingKind);
}

function persist() {
  if (!state.article) return;
  const store = loadWorkspaceStore();
  store[workspaceKey(state.article)] = {
    article: state.article,
    notes: [...state.notes]
  };
  saveWorkspaceStore(store);
  sessionHistory = nextHistory(sessionHistory, state.article, state.notes.length);
  saveJson(HISTORY_KEY, sessionHistory);
}

function restore(article) {
  const saved = getSavedWorkspaceByUrl(workspaceKey(article));
  state = saved ? { article, notes: saved.notes || [] } : { article, notes: [] };
  persist();
  render();
}

function openSample() {
  elements.urlInput.value = "";
  restore(sampleArticle);
  setStatus(elements, "Demo cargada.");
}

async function loadUrl(rawUrl) {
  const url = normalizeArticleUrl(rawUrl);
  elements.urlInput.value = url;

  const saved = getSavedWorkspaceByUrl(url);
  if (saved?.article) {
    restore(saved.article);
    flashStatus(elements, "Ya estaba guardado en este navegador. Lo recuperamos sin pedirlo al servidor.");
    return;
  }

  setStatus(elements, "Cargando articulo...");
  const payload = await fetchReadableArticle(url);
  restore(payload.article);
  setStatus(elements, payload.cache === "hit" ? "Articulo cargado desde cache del servidor." : "Articulo cargado.");
}

async function openHistoryUrl(url) {
  const saved = getSavedWorkspaceByUrl(url);
  if (saved?.article) {
    elements.urlInput.value = saved.article.url.startsWith("demo://") ? "" : saved.article.url;
    restore(saved.article);
    flashStatus(elements, "Abierto desde el historial local.");
    return;
  }

  await loadUrl(url);
}

function clearPending() {
  pendingSelection = null;
  delete elements.selectionCard.dataset.activeKind;
  elements.selectionNote.value = "";
  elements.selectionToolbar.classList.remove("visible");
  window.getSelection()?.removeAllRanges();
  renderPending(elements, pendingSelection, pendingKind);
}

function createNote(input) {
  if (!state.article) return;
  state.notes = [{
    id: `note_${Date.now()}_${Math.random().toString(16).slice(2)}`,
    kind: input.kind,
    selectedText: input.selectedText || "",
    paragraphIndex: input.paragraphIndex ?? null,
    note: input.note || "",
    sourceUrl: state.article.url,
    sourceTitle: state.article.title,
    createdAt: new Date().toISOString()
  }, ...state.notes].slice(0, MAX_SESSION_NOTES);
  persist();
  render();
}

function savePending() {
  if (!pendingSelection) return;
  createNote({
    ...pendingSelection,
    kind: pendingKind,
    note: elements.selectionNote.value.trim()
  });
  clearPending();
  setStatus(elements, "Nota guardada.");
}

function setPendingKind(kind) {
  if (!KIND_ORDER.includes(kind)) return;
  pendingKind = kind;
  renderPending(elements, pendingSelection, pendingKind);
}

function cyclePendingKind(direction) {
  const currentIndex = KIND_ORDER.indexOf(pendingKind);
  const nextIndex = (currentIndex + direction + KIND_ORDER.length) % KIND_ORDER.length;
  setPendingKind(KIND_ORDER[nextIndex]);
}

function saveLooseNote() {
  const note = elements.looseNote.value.trim();
  if (!note) return;
  createNote({ kind: "highlight", note });
  elements.looseNote.value = "";
  setStatus(elements, "Nota guardada.");
}

function stageSelection(kind) {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0) return;
  const range = selection.getRangeAt(0);
  if (!elements.articleBody.contains(range.commonAncestorContainer)) return;

  const selectedText = selection.toString().trim().replace(/\s+/g, " ");
  if (!selectedText) return;

  const node = range.startContainer.nodeType === Node.TEXT_NODE ? range.startContainer.parentElement : range.startContainer;
  const paragraph = node?.closest?.("[data-paragraph-index]");
  pendingSelection = {
    selectedText,
    paragraphIndex: paragraph ? Number(paragraph.dataset.paragraphIndex) : null
  };
  setPendingKind(kind);
  elements.selectionNote.value = "";
  renderPending(elements, pendingSelection, pendingKind);
  elements.selectionNote.focus();
}

elements.form.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    await loadUrl(elements.urlInput.value);
  } catch (error) {
    setStatus(elements, error instanceof Error ? error.message : "Error.");
  }
});

elements.sampleBtn.addEventListener("click", openSample);
elements.emptySampleBtn.addEventListener("click", openSample);
elements.saveSelectionBtn.addEventListener("click", savePending);
elements.clearSelectionBtn.addEventListener("click", clearPending);
elements.saveLooseBtn.addEventListener("click", saveLooseNote);
elements.historyList.addEventListener("click", (event) => {
  const button = event.target.closest("[data-history-url]");
  if (!button) return;
  void openHistoryUrl(button.dataset.historyUrl).catch((error) => {
    setStatus(elements, error instanceof Error ? error.message : "No se pudo abrir el historial.");
  });
});

document.querySelectorAll(".kind-btn").forEach((button) => {
  button.addEventListener("click", () => setPendingKind(button.dataset.kind));
});

document.querySelectorAll("[data-toolbar-kind]").forEach((button) => {
  button.addEventListener("mousedown", (event) => event.preventDefault());
  button.addEventListener("click", () => stageSelection(button.dataset.toolbarKind));
});

elements.articleBody.addEventListener("mouseup", () => {
  window.setTimeout(() => positionToolbar(elements), 0);
});
elements.articleBody.addEventListener("mousedown", (event) => {
  if (!event.target.closest(".toolbar")) elements.selectionToolbar.classList.remove("visible");
});
document.addEventListener("keydown", (event) => {
  if (pendingSelection && event.key === "Tab") {
    event.preventDefault();
    cyclePendingKind(event.shiftKey ? -1 : 1);
    return;
  }

  if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
    event.preventDefault();
    if (pendingSelection) {
      savePending();
      return;
    }
    if (document.activeElement === elements.looseNote) {
      saveLooseNote();
    }
    return;
  }

  if (event.key === "Escape") clearPending();
});

openSample();
