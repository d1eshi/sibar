import { randomUUID } from "node:crypto";

export type NoteSourceType = "video" | "url" | "text" | "unknown";

export type NoteContext = {
  url?: string;
  source_title?: string;
  source_type?: NoteSourceType;
  app_hint?: string;
};

export type NoteEntry = {
  entry_id: string;
  note_id: string;
  created_at: string;
  text: string;
};

export type Note = {
  note_id: string;
  created_at: string;
  updated_at: string;
  title: string;
  instruction?: string;
  context: NoteContext;
  entries: NoteEntry[];
  detected_topics: string[];
};

export type StoredNoteEvent =
  | { event_type: "note_started"; note: Note }
  | { event_type: "note_appended"; note_id: string; entry: NoteEntry; updated_at: string; instruction?: string; context?: NoteContext; title?: string; detected_topics: string[] };

export type StartNoteInput = {
  title?: string;
  instruction?: string;
  context?: NoteContext;
};

export type AppendNoteInput = StartNoteInput & {
  text: string;
};

const TOPIC_WORDS = ["memory", "agent", "runtime", "architecture", "swift", "typescript"] as const;
const INSTRUCTION_PREFIX = /^(como|cómo|how\s+(do\s+i|to|can\s+i)|quiero|necesito|ayudame|ayúdame|mejora|mejorar)\b/i;

export function nowISO(): string {
  return new Date().toISOString();
}

export function newNoteID(): string {
  return randomUUID();
}

export function createEntry(noteID: string, text: string, createdAt = nowISO()): NoteEntry {
  return {
    entry_id: randomUUID(),
    note_id: noteID,
    created_at: createdAt,
    text,
  };
}

export function normalizeContext(input?: NoteContext): NoteContext {
  const context: NoteContext = {};
  const url = input?.url?.trim();
  const sourceTitle = input?.source_title?.trim();
  const appHint = input?.app_hint?.trim();

  if (url) context.url = url;
  if (sourceTitle) context.source_title = sourceTitle;
  if (appHint) context.app_hint = appHint;
  context.source_type = inferSourceType(url, input?.source_type);

  return context;
}

export function inferSourceType(url?: string, declared?: NoteSourceType): NoteSourceType {
  if (url && /(^https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(url)) {
    return "video";
  }
  if (declared) return declared;
  if (url) return "url";
  return "unknown";
}

export function deriveTitle(input: StartNoteInput, fallback = "Untitled note"): string {
  const title = input.title?.trim();
  if (title) return title;
  const sourceTitle = input.context?.source_title?.trim();
  if (sourceTitle) return sourceTitle;
  const instruction = input.instruction?.trim();
  if (instruction) return instruction.slice(0, 80);
  const url = input.context?.url?.trim();
  if (url) return url;
  return fallback;
}

export function inferInstructionFromText(text: string): string | undefined {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (!normalized) return undefined;
  if (INSTRUCTION_PREFIX.test(normalized)) return normalized.slice(0, 240);
  if (/\b(goal|instruction|objetivo|instruccion|instrucción)\s*:/i.test(normalized)) return normalized.slice(0, 240);
  return undefined;
}

export function mergeContext(existing: NoteContext, incoming?: NoteContext): NoteContext {
  const normalized = normalizeContext(incoming);
  return {
    ...existing,
    ...Object.fromEntries(Object.entries(normalized).filter(([, value]) => value !== undefined && value !== "")),
  };
}

export function detectTopics(note: Pick<Note, "title" | "instruction" | "context" | "entries">): string[] {
  const haystack = [
    note.title,
    note.instruction ?? "",
    note.context.url ?? "",
    note.context.source_title ?? "",
    note.context.source_type ?? "",
    note.context.app_hint ?? "",
    ...note.entries.map((entry) => entry.text),
  ].join("\n").toLowerCase();

  return TOPIC_WORDS.filter((topic) => haystack.includes(topic));
}

export function createNote(input: StartNoteInput = {}, createdAt = nowISO()): Note {
  const context = normalizeContext(input.context);
  const note: Note = {
    note_id: newNoteID(),
    created_at: createdAt,
    updated_at: createdAt,
    title: deriveTitle(input),
    instruction: input.instruction?.trim() || undefined,
    context,
    entries: [],
    detected_topics: [],
  };
  note.detected_topics = detectTopics(note);
  return note;
}

export function applyAppend(note: Note, input: AppendNoteInput, updatedAt = nowISO()): { note: Note; entry: NoteEntry } {
  const entry = createEntry(note.note_id, input.text.trim(), updatedAt);
  const inferredInstruction = input.instruction?.trim() || note.instruction || inferInstructionFromText(input.text);
  const title = input.title?.trim()
    || (note.title === "Untitled note" && inferredInstruction ? inferredInstruction.slice(0, 80) : note.title);
  const next: Note = {
    ...note,
    updated_at: updatedAt,
    title,
    instruction: inferredInstruction,
    context: mergeContext(note.context, input.context),
    entries: [...note.entries, entry],
    detected_topics: [],
  };
  next.detected_topics = detectTopics(next);
  return { note: next, entry };
}

export function applyNoteEvent(notes: Map<string, Note>, event: StoredNoteEvent): void {
  if (event.event_type === "note_started") {
    notes.set(event.note.note_id, event.note);
    return;
  }

  const existing = notes.get(event.note_id);
  if (!existing) return;
  const next: Note = {
    ...existing,
    updated_at: event.updated_at,
    title: event.title ?? existing.title,
    instruction: event.instruction ?? existing.instruction,
    context: event.context ? mergeContext(existing.context, event.context) : existing.context,
    entries: [...existing.entries, event.entry],
    detected_topics: event.detected_topics,
  };
  notes.set(next.note_id, next);
}
