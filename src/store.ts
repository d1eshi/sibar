/**
 * Sibi Local Memory Store
 *
 * Lightweight file-based memory store for the pedagogy layer.
 * Implements the MemoryStore concept from docs/research/memory_abstractions.md
 * using only node built-ins — no npm dependencies.
 *
 * @see docs/research/memory_abstractions.md §3 — MemoryStore Interface
 * @see docs/research/memory_abstractions.md §3.1 — Data Types
 */

import { existsSync, readFileSync, writeFileSync, appendFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

import type { Layer, Confidence } from "./pedagogy/index.ts";
import type { EvidenceSource } from "./pedagogy/signals.ts";
import { applyNoteEvent, type Note, type StoredNoteEvent } from "./notes.ts";

// ─── Paths ─────────────────────────────────────────────────────────────────

function getSibarDir(): string {
  return process.env.SIBI_RUNTIME_HOME || join(homedir(), ".sibar");
}

function resourcesPath(): string {
  return join(getSibarDir(), "resources.json");
}

function conceptMapPath(): string {
  return join(getSibarDir(), "concept_map.json");
}

function signalHistoryPath(): string {
  return join(getSibarDir(), "signal_history.jsonl");
}

function notesPath(): string {
  return join(getSibarDir(), "notes.jsonl");
}

function activeNotePath(): string {
  return join(getSibarDir(), "active-note.json");
}

function ensureDir(): void {
  const dir = getSibarDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

// ─── Types ─────────────────────────────────────────────────────────────────

/**
 * A captured resource (doc, article, repo, etc.) associated with a project.
 * @see docs/research/memory_abstractions.md §3.1 — Resource
 */
export interface Resource {
  id?: number;
  url: string;
  title?: string;
  notes: string;
  project_label: string;
  resource_type: string;
  captured_at: string;
}

/**
 * A concept-to-layer mapping entry in the concept map.
 * @see docs/research/memory_abstractions.md §3.1 — ConceptMapEntry
 */
export interface ConceptMapEntry {
  concept: string;
  current_layer: Layer;
  confidence: Confidence;
  verified: boolean;
  last_verified?: string;
  updated_at: string;
}

/**
 * A recorded signal with full provenance information.
 * @see docs/research/memory_abstractions.md §3.1 — SignalRecord
 */
export interface SignalRecord {
  signal_id: string;
  session_id: string;
  concept: string;
  source: string;
  evidence: string;
  confidence: Confidence;
  source_type?: EvidenceSource;
  observed_at: string;
}

// ─── Resource Store (§3.1 — Resource CRUD) ─────────────────────────────────

/**
 * Read all resources from the JSON array file.
 * Returns an empty array if the file does not exist or is empty.
 */
function readResources(): Resource[] {
  const path = resourcesPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8").trim();
    if (!raw) return [];
    return JSON.parse(raw) as Resource[];
  } catch {
    return [];
  }
}

/**
 * Write the full resource array to disk.
 */
function writeResources(resources: Resource[]): void {
  ensureDir();
  writeFileSync(resourcesPath(), JSON.stringify(resources, null, 2), "utf-8");
}

/**
 * Save a captured resource.
 *
 * If the resource has no `id`, one is auto-assigned as max(existing) + 1.
 * Otherwise, an existing resource with the same `id` is updated.
 *
 * @param r — The resource to persist.
 * @returns The assigned resource ID.
 *
 * @see docs/research/memory_abstractions.md §3.1 — Resource
 */
export function saveResource(r: Resource): number {
  const resources = readResources();
  const id = r.id ?? (resources.length > 0 ? Math.max(...resources.map((x) => x.id!).filter((n) => n != null)) + 1 : 1);

  const existing = resources.findIndex((x) => x.id === id);
  const entry: Resource = { ...r, id };
  if (existing >= 0) {
    resources[existing] = entry;
  } else {
    resources.push(entry);
  }

  writeResources(resources);
  return id;
}

/**
 * List all captured resources, optionally filtered by project label.
 *
 * @param projectLabel — Optional project label to filter by.
 * @returns Array of matching resources.
 *
 * @see docs/research/memory_abstractions.md §3 — listResourcesByProject
 */
export function listResources(projectLabel?: string): Resource[] {
  const resources = readResources();
  if (projectLabel !== undefined) {
    return resources.filter((r) => r.project_label === projectLabel);
  }
  return resources;
}

/**
 * Get a single resource by its numeric ID.
 *
 * @param id — The resource ID.
 * @returns The resource, or `null` if not found.
 *
 * @see docs/research/memory_abstractions.md §3 — getResource
 */
export function getResource(id: number): Resource | null {
  const resources = readResources();
  return resources.find((r) => r.id === id) ?? null;
}

// ─── Project Store (§3 — Project Association Model) ────────────────────────

/**
 * List all unique project labels across captured resources.
 *
 * @returns Deduplicated, sorted list of project label strings.
 *
 * @see docs/research/memory_abstractions.md §3 — project association model
 */
export function listProjects(): string[] {
  const resources = readResources();
  const labels = new Set(resources.map((r) => r.project_label));
  return [...labels].sort();
}

/**
 * Get all resources belonging to a specific project label.
 *
 * @param label — The project label.
 * @returns Array of resources for that project.
 *
 * @see docs/research/memory_abstractions.md §3 — listResourcesByProject
 */
export function getProjectResources(label: string): Resource[] {
  return listResources(label);
}

// ─── Concept Map Store (§2.1 — concept_layer_map) ──────────────────────────

/**
 * Read the concept map from disk.
 * Returns an empty object if the file does not exist.
 */
function readConceptMap(): Record<string, ConceptMapEntry> {
  const path = conceptMapPath();
  if (!existsSync(path)) return {};
  try {
    const raw = readFileSync(path, "utf-8").trim();
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, ConceptMapEntry>;
  } catch {
    return {};
  }
}

/**
 * Write the full concept map to disk.
 */
function writeConceptMap(map: Record<string, ConceptMapEntry>): void {
  ensureDir();
  writeFileSync(conceptMapPath(), JSON.stringify(map, null, 2), "utf-8");
}

/**
 * Insert or update a concept's layer and confidence mapping.
 *
 * Creates the concept entry if it does not exist; updates it if it does.
 * Automatically sets `updated_at` to the current ISO timestamp.
 * Preserves `verified` and `last_verified` state on update.
 *
 * @param concept    — The concept name.
 * @param layer      — The current pedagogical layer (1-5).
 * @param confidence — Confidence of the layer assignment.
 *
 * @see docs/research/memory_abstractions.md §2.1 — concept_layer_map
 * @see docs/research/memory_abstractions.md §3 — upsertConcept
 */
export function upsertConcept(concept: string, layer: Layer, confidence: Confidence): void {
  const map = readConceptMap();
  const now = new Date().toISOString();
  const existing = map[concept];

  map[concept] = {
    concept,
    current_layer: layer,
    confidence,
    verified: existing?.verified ?? false,
    last_verified: existing?.last_verified,
    updated_at: now,
  };

  writeConceptMap(map);
}

/**
 * Get the full concept map as a record keyed by concept name.
 *
 * @returns The concept map record.
 *
 * @see docs/research/memory_abstractions.md §3 — buildConceptMap
 */
export function getConceptMap(): Record<string, ConceptMapEntry> {
  return readConceptMap();
}

// ─── Signal History Store (§2.2 — signal_history) ──────────────────────────

/**
 * Read all signal records from the JSONL file.
 * Returns an empty array if the file does not exist.
 *
 * JSONL format: one JSON object per line, `\n` delimited.
 */
function readSignalHistory(): SignalRecord[] {
  const path = signalHistoryPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8").trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as SignalRecord);
  } catch {
    return [];
  }
}

/**
 * Record a new signal observation with full provenance.
 *
 * Appends one JSON line to the signal history JSONL file.
 * Creates the file and parent directory if they don't exist.
 *
 * @param s — The signal record to persist.
 *
 * @see docs/research/memory_abstractions.md §2.2 — signal_history
 * @see docs/research/memory_abstractions.md §3 — recordSignal
 * @see docs/research/memory_abstractions.md §5 — Evidence Chain
 */
export function recordSignal(s: SignalRecord): void {
  ensureDir();
  const line = JSON.stringify(s) + "\n";
  appendFileSync(signalHistoryPath(), line, "utf-8");
}

/**
 * Get all signal records for a given concept.
 *
 * Reads the full JSONL signal history and filters by concept name.
 *
 * @param concept — The concept to retrieve signals for.
 * @returns Array of signal records in chronological order (append order).
 *
 * @see docs/research/memory_abstractions.md §3 — getSignalsForConcept
 */
export function getSignalsForConcept(concept: string): SignalRecord[] {
  const history = readSignalHistory();
  return history.filter((s) => s.concept === concept);
}

// ─── Continuous Notes Store ────────────────────────────────────────────────

export function appendNoteEvent(event: StoredNoteEvent): void {
  ensureDir();
  appendFileSync(notesPath(), JSON.stringify(event) + "\n", "utf-8");
}

export function readNoteEvents(): StoredNoteEvent[] {
  const path = notesPath();
  if (!existsSync(path)) return [];
  try {
    const raw = readFileSync(path, "utf-8").trim();
    if (!raw) return [];
    return raw
      .split("\n")
      .filter((line) => line.trim())
      .map((line) => JSON.parse(line) as StoredNoteEvent);
  } catch {
    return [];
  }
}

export function listNotes(limit = 20): Note[] {
  const notes = new Map<string, Note>();
  for (const event of readNoteEvents()) {
    applyNoteEvent(notes, event);
  }
  return [...notes.values()]
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at))
    .slice(0, limit);
}

export function getNote(noteID: string): Note | null {
  return listNotes(Number.MAX_SAFE_INTEGER).find((note) => note.note_id === noteID) ?? null;
}

export function readActiveNoteID(): string | null {
  const path = activeNotePath();
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, "utf-8").trim();
    if (!raw) return null;
    const state = JSON.parse(raw) as { note_id?: string };
    return state.note_id ?? null;
  } catch {
    return null;
  }
}

export function writeActiveNoteID(noteID: string): void {
  ensureDir();
  writeFileSync(activeNotePath(), JSON.stringify({ note_id: noteID }, null, 2), "utf-8");
}

export function getActiveNote(): Note | null {
  const noteID = readActiveNoteID();
  return noteID ? getNote(noteID) : null;
}
