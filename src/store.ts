import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

import type { Confidence, Layer } from "./pedagogy/index.ts";
import type { EvidenceSource } from "./pedagogy/signals.ts";

function getSibarDir(): string {
  return process.env.SIBI_RUNTIME_HOME || join(homedir(), ".sibar");
}

function ensureDir(): void {
  const dir = getSibarDir();
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
}

function conceptMapPath(): string {
  return join(getSibarDir(), "concept_map.json");
}

function signalHistoryPath(): string {
  return join(getSibarDir(), "signal_history.jsonl");
}

export interface ConceptMapEntry {
  concept: string;
  current_layer: Layer;
  confidence: Confidence;
  verified: boolean;
  last_verified?: string;
  updated_at: string;
}

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

function writeConceptMap(map: Record<string, ConceptMapEntry>): void {
  ensureDir();
  writeFileSync(conceptMapPath(), JSON.stringify(map, null, 2), "utf-8");
}

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

export function getConceptMap(): Record<string, ConceptMapEntry> {
  return readConceptMap();
}

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

export function recordSignal(s: SignalRecord): void {
  ensureDir();
  appendFileSync(signalHistoryPath(), JSON.stringify(s) + "\n", "utf-8");
}

export function getSignalsForConcept(concept: string): SignalRecord[] {
  return readSignalHistory().filter((s) => s.concept === concept);
}
