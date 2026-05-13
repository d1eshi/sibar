/**
 * Signal-Based Rubric
 *
 * Defines observable evidence signals sibi uses to detect which pedagogical
 * layer the user is operating at. Signals are derived from declared intent
 * and tool observation — never from keystroke logging or screen capture.
 *
 * @see docs/research/pedagogical_layers.md §3 — The Signal-Based Rubric
 */

import { Layer, getAllLayers } from "./layers.ts";

/** Confidence level of a detected signal. */
export type ConfidenceLevel = "low" | "medium" | "high";

/** Alias for backward-compatibility with droids-generated code. */
export type Confidence = ConfidenceLevel;

/** Where the evidence for the signal came from. */
export type EvidenceSource =
  | "observer_query"
  | "tool_observation"
  | "question_response"
  | "ownership_question"
  | "system_walkthrough"
  | "explanation_analysis"
  | "text_similarity"
  | "boundary_question"
  | "architecture_question"
  | "risk_analysis"
  | "code_observation"
  | "discussion_capture"
  | "explanation_capture"
  | "repo_activity";

/**
 * A single defined signal in the rubric.
 * @see docs/research/pedagogical_layers.md §3
 */
export interface SignalDefinition {
  /** Unique signal identifier (e.g. "S2.1"). */
  id: string;
  /** Human-readable description of what was observed. */
  description: string;
  /** Which pedagogical layer this signal maps to. */
  layer: Layer;
  /** How confident sibi is in this signal type. */
  defaultConfidence: Confidence;
  /** Where the evidence typically comes from. */
  evidenceSource: EvidenceSource;
}

/**
 * An observed instance of a signal with concrete evidence.
 * @see docs/research/pedagogical_layers.md §6.1
 */
export interface ObservedSignal {
  /** The signal definition ID that was triggered. */
  signalId: string;
  /** Which layer this signal maps to. */
  layer: Layer;
  /** The assessed confidence for this observation. */
  confidence: Confidence;
  /** Concrete evidence that triggered this signal. */
  evidence: string;
  /** ISO timestamp of the observation. */
  observedAt: string;
}

/**
 * Result of detecting which layer(s) a concept maps to.
 * @see docs/research/pedagogical_layers.md §6.2
 */
export interface LayerDetection {
  /** The concept or area being evaluated. */
  concept: string;
  /** The highest layer detected from signals. */
  highestLayer: Layer;
  /** Average confidence across all observed signals for this concept. */
  averageConfidence: Confidence;
  /** The observed signals that informed this detection. */
  observedSignals: ObservedSignal[];
}

/**
 * A single observable evidence signal definition.
 * @deprecated Use SignalDefinition for rubric entries, ObservedSignal for instances.
 */
export type Signal = SignalDefinition;

// ─── Layer 1 — Surface Recognition (§3.1) ───────────────────────────────────

const L1_SIGNALS: SignalDefinition[] = [
  {
    id: "S1.1",
    description: 'User asks "what is X?" or searches for a term',
    layer: 1,
    defaultConfidence: "high",
    evidenceSource: "observer_query",
  },
  {
    id: "S1.2",
    description: "User copies a file/pattern without modifying structure",
    layer: 1,
    defaultConfidence: "medium",
    evidenceSource: "tool_observation",
  },
  {
    id: "S1.3",
    description: "User hesitates when asked to locate a concept in the repo",
    layer: 1,
    defaultConfidence: "medium",
    evidenceSource: "question_response",
  },
  {
    id: "S1.4",
    description:
      "User correctly identifies a concept name but cannot describe its role",
    layer: 1,
    defaultConfidence: "high",
    evidenceSource: "ownership_question",
  },
];

// ─── Layer 2 — Isolated Explanation (§3.2) ─────────────────────────────────

const L2_SIGNALS: SignalDefinition[] = [
  {
    id: "S2.1",
    description: "User explains a concept clearly but only in its own file/module context",
    layer: 2,
    defaultConfidence: "high",
    evidenceSource: "ownership_question",
  },
  {
    id: "S2.2",
    description: "User cannot trace what calls this or what this calls",
    layer: 2,
    defaultConfidence: "medium",
    evidenceSource: "system_walkthrough",
  },
  {
    id: "S2.3",
    description: 'User describes "what" accurately but not "why"',
    layer: 2,
    defaultConfidence: "medium",
    evidenceSource: "explanation_analysis",
  },
  {
    id: "S2.4",
    description: "User relies on comments/docs verbatim without rephrasing",
    layer: 2,
    defaultConfidence: "low",
    evidenceSource: "text_similarity",
  },
];

// ─── Layer 3 — Contextual Connection (§3.3) ────────────────────────────────

const L3_SIGNALS: SignalDefinition[] = [
  {
    id: "S3.1",
    description: "User traces a data flow across 2+ module boundaries correctly",
    layer: 3,
    defaultConfidence: "high",
    evidenceSource: "system_walkthrough",
  },
  {
    id: "S3.2",
    description: "User identifies which component owns a given responsibility",
    layer: 3,
    defaultConfidence: "high",
    evidenceSource: "boundary_question",
  },
  {
    id: "S3.3",
    description: "User can draw (verbally or visually) the dependency graph",
    layer: 3,
    defaultConfidence: "medium",
    evidenceSource: "architecture_question",
  },
  {
    id: "S3.4",
    description: "User correctly predicts what breaks if a boundary is removed",
    layer: 3,
    defaultConfidence: "medium",
    evidenceSource: "risk_analysis",
  },
];

// ─── Layer 4 — Applied Reasoning (§3.4) ────────────────────────────────────

const L4_SIGNALS: SignalDefinition[] = [
  {
    id: "S4.1",
    description: "User debugs a failure by reasoning about root cause across layers",
    layer: 4,
    defaultConfidence: "high",
    evidenceSource: "risk_analysis",
  },
  {
    id: "S4.2",
    description: "User proposes a refactor that respects existing contracts",
    layer: 4,
    defaultConfidence: "high",
    evidenceSource: "code_observation",
  },
  {
    id: "S4.3",
    description: "User extends the system at a boundary without breaking existing tests",
    layer: 4,
    defaultConfidence: "medium",
    evidenceSource: "tool_observation",
  },
  {
    id: "S4.4",
    description: "User explains tradeoffs between two design alternatives",
    layer: 4,
    defaultConfidence: "medium",
    evidenceSource: "ownership_question",
  },
];

// ─── Layer 5 — Fluent Ownership (§3.5) ────────────────────────────────────

const L5_SIGNALS: SignalDefinition[] = [
  {
    id: "S5.1",
    description: "User challenges a design assumption with a concrete alternative",
    layer: 5,
    defaultConfidence: "high",
    evidenceSource: "discussion_capture",
  },
  {
    id: "S5.2",
    description: "User teaches the concept to another agent or person accurately",
    layer: 5,
    defaultConfidence: "high",
    evidenceSource: "explanation_capture",
  },
  {
    id: "S5.3",
    description: "User identifies an undocumented invariant and articulates it",
    layer: 5,
    defaultConfidence: "high",
    evidenceSource: "code_observation",
  },
  {
    id: "S5.4",
    description: "User contributes a spec or contract that governs the concept",
    layer: 5,
    defaultConfidence: "medium",
    evidenceSource: "repo_activity",
  },
];

// ─── Full signal catalog ───────────────────────────────────────────────────

/** All signal definitions, indexed by layer for efficient lookup. */
export const SIGNAL_CATALOG: Record<Layer, SignalDefinition[]> = {
  [Layer.L1_SURFACE_RECOGNITION]: L1_SIGNALS,
  [Layer.L2_ISOLATED_EXPLANATION]: L2_SIGNALS,
  [Layer.L3_CONTEXTUAL_CONNECTION]: L3_SIGNALS,
  [Layer.L4_APPLIED_REASONING]: L4_SIGNALS,
  [Layer.L5_FLUENT_OWNERSHIP]: L5_SIGNALS,
};

/** Alias — the full signal rubric. */
export const SIGNAL_RUBRIC = SIGNAL_CATALOG;

/** Flat list of all signal definitions. */
export const ALL_SIGNALS: SignalDefinition[] = [
  ...L1_SIGNALS,
  ...L2_SIGNALS,
  ...L3_SIGNALS,
  ...L4_SIGNALS,
  ...L5_SIGNALS,
];

/** Look up a signal definition by its ID. */
export function signalById(id: string): SignalDefinition | undefined {
  return ALL_SIGNALS.find((s) => s.id === id);
}

/** Get all signal definitions for a given layer. */
export function signalsForLayer(layer: Layer): SignalDefinition[] {
  return SIGNAL_CATALOG[layer] ?? [];
}

// ─── Detection logic ───────────────────────────────────────────────────────

/** Aggregated signal summary for a concept at a given layer. */
export interface LayerSignalSummary {
  layer: Layer;
  label: string;
  signalCount: number;
  highConfidenceCount: number;
  mediumConfidenceCount: number;
  lowConfidenceCount: number;
}

/**
 * Aggregate observed signals into per-layer summaries.
 *
 * @param observedSignalIds — IDs of signals that were observed (e.g. ["S1.1", "S2.3"])
 * @returns One summary per layer with signal counts by confidence.
 */
export function aggregateSignals(
  observedSignalIds: string[],
): LayerSignalSummary[] {
  const catalogById = new Map<string, SignalDefinition>();
  for (const s of ALL_SIGNALS) catalogById.set(s.id, s);

  const summaries: LayerSignalSummary[] = [];
  for (const layer of getAllLayers()) {
    const signals = SIGNAL_CATALOG[layer] ?? [];
    let high = 0;
    let med = 0;
    let low = 0;
    for (const s of signals) {
      if (observedSignalIds.includes(s.id)) {
        if (s.defaultConfidence === "high") high++;
        else if (s.defaultConfidence === "medium") med++;
        else low++;
      }
    }
    summaries.push({
      layer,
      label: `L${layer}`,
      signalCount: high + med + low,
      highConfidenceCount: high,
      mediumConfidenceCount: med,
      lowConfidenceCount: low,
    });
  }
  return summaries;
}

/**
 * Detect the most probable pedagogical layer based on observed signals.
 *
 * Only considers layers where at least one `high` or `medium` confidence
 * signal was observed. Low-confidence signals alone are not sufficient.
 *
 * @param observedSignalIds — IDs of observed evidence signals
 * @returns The detected layer, or null if insufficient evidence
 */
export function detectLayer(observedSignalIds: string[]): Layer | null {
  const summaries = aggregateSignals(observedSignalIds);

  // Find the highest layer with at least one high-confidence signal
  for (let i = summaries.length - 1; i >= 0; i--) {
    const s = summaries[i]!;
    if (s.highConfidenceCount > 0) return s.layer;
  }

  // Fall back to highest layer with at least one medium-confidence signal
  for (let i = summaries.length - 1; i >= 0; i--) {
    const s = summaries[i]!;
    if (s.mediumConfidenceCount > 0) return s.layer;
  }

  return null;
}

/**
 * Minimum observation window (in seconds) before sibi can emit a `medium`
 * confidence signal for a given concept.
 *
 * @see docs/research/pedagogical_layers.md §9 — Open Questions
 */
export const MIN_OBSERVATION_WINDOW_SECONDS = 120;
