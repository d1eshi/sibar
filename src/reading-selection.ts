export type ReadingSelectionInput = {
  source_title?: string | null;
  source_url?: string | null;
  document_path?: string | null;
  selected_text: string;
  user_note?: string | null;
};

export type RuntimeReadingSelection = {
  source_title?: string | null;
  source_url?: string | null;
  document_path?: string | null;
  selected_text: string;
  user_note?: string | null;
};

export class ReadingSelectionError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

export function normalizeReadingSelection(input: ReadingSelectionInput): RuntimeReadingSelection {
  const selectedText = String(input.selected_text || "");
  if (!selectedText.trim()) {
    throw new ReadingSelectionError("empty_selection", "prepare_reading_question requires selected_text.");
  }
  if (selectedText.length > 8000) {
    throw new ReadingSelectionError("selection_too_large", "Reading selections are limited to 8,000 characters.");
  }

  return {
    source_title: cleanOptional(input.source_title),
    source_url: cleanOptional(input.source_url),
    document_path: cleanOptional(input.document_path),
    selected_text: normalizeWhitespace(selectedText),
    user_note: cleanOptional(input.user_note),
  };
}

export function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function cleanOptional(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}
