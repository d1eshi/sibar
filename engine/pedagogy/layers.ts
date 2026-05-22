/**
 * Pedagogy Layer Definitions
 *
 * Defines the five progressive layers of understanding that sibi can detect.
 * These are diagnostic waypoints, not grades.
 *
 * @see docs/research/pedagogical_layers.md §2 — The Five Pedagogical Layers
 */

// ─── Layer enum (numeric + named access) ───────────────────────────────────

/**
 * Progressive level of understanding for a concept or system.
 *
 * Used both as numeric literal (1-5) and named members for code clarity.
 */
export const Layer = {
  L1_SURFACE_RECOGNITION: 1,
  L2_ISOLATED_EXPLANATION: 2,
  L3_CONTEXTUAL_CONNECTION: 3,
  L4_APPLIED_REASONING: 4,
  L5_FLUENT_OWNERSHIP: 5,
} as const;
export type Layer = (typeof Layer)[keyof typeof Layer];

/** Convert a Layer value to its numeric representation. */
export function layerToNumber(layer: Layer): number {
  return layer;
}

/** All layers in progression order. */
export function getAllLayers(): Layer[] {
  return [1, 2, 3, 4, 5] as Layer[];
}

// ─── Layer descriptors ─────────────────────────────────────────────────────

/** Metadata about a pedagogical layer. */
export interface LayerDescriptor {
  layer: Layer;
  name: string;
  capability: string;
  signalCategory: string;
}

/** §2.1 — Layer descriptions with capabilities. */
export const LAYER_DESCRIPTIONS: Record<Layer, LayerDescriptor> = {
  [Layer.L1_SURFACE_RECOGNITION]: {
    layer: Layer.L1_SURFACE_RECOGNITION,
    name: "Surface Recognition",
    capability: "Recognize a term, file, or concept name when seen. Cannot explain it.",
    signalCategory: "recognition",
  },
  [Layer.L2_ISOLATED_EXPLANATION]: {
    layer: Layer.L2_ISOLATED_EXPLANATION,
    name: "Isolated Explanation",
    capability: "Explain the concept in isolation with reasonable accuracy. Cannot connect it to the system.",
    signalCategory: "explanation",
  },
  [Layer.L3_CONTEXTUAL_CONNECTION]: {
    layer: Layer.L3_CONTEXTUAL_CONNECTION,
    name: "Contextual Connection",
    capability: "Explain how the concept relates to neighboring concepts, boundaries, and data flows.",
    signalCategory: "connection",
  },
  [Layer.L4_APPLIED_REASONING]: {
    layer: Layer.L4_APPLIED_REASONING,
    name: "Applied Reasoning",
    capability: "Reason about the concept under a novel scenario, debug a failure, or predict a side effect.",
    signalCategory: "application",
  },
  [Layer.L5_FLUENT_OWNERSHIP]: {
    layer: Layer.L5_FLUENT_OWNERSHIP,
    name: "Fluent Ownership",
    capability: "Defend the design choice, refactor with confidence, teach it to another, or challenge its assumptions.",
    signalCategory: "ownership",
  },
};

// Backward-compatible aliases
export const LayerLabel = Object.fromEntries(
  getAllLayers().map((l) => [l, LAYER_DESCRIPTIONS[l].name]),
) as Record<Layer, string>;

export const LayerCapability = Object.fromEntries(
  getAllLayers().map((l) => [l, LAYER_DESCRIPTIONS[l].capability]),
) as Record<Layer, string>;

// ─── Task types ────────────────────────────────────────────────────────────

/** The type of task the user is working on. */
export type TaskType =
  | "read-and-understand"
  | "make-small-change"
  | "refactor-module"
  | "design-boundary"
  | "review-architecture"
  | "teach-concept"
  | "unknown";

/**
 * Task types and the minimum layer required to perform them confidently.
 * @see docs/research/pedagogical_layers.md §4.1 — Gap Detection Triggers
 */
export const MINIMUM_LAYER_FOR_TASK: Record<TaskType, Layer> = {
  "read-and-understand": Layer.L2_ISOLATED_EXPLANATION,
  "make-small-change": Layer.L3_CONTEXTUAL_CONNECTION,
  "refactor-module": Layer.L4_APPLIED_REASONING,
  "design-boundary": Layer.L4_APPLIED_REASONING,
  "review-architecture": Layer.L5_FLUENT_OWNERSHIP,
  "teach-concept": Layer.L5_FLUENT_OWNERSHIP,
  unknown: Layer.L1_SURFACE_RECOGNITION,
};

/** Alias for backward-compatibility. */
export const TaskMinimumLayer = MINIMUM_LAYER_FOR_TASK;

// ─── Signal types ──────────────────────────────────────────────────────────

/** Category of learning signal. */
export type SignalType = "recognition" | "explanation" | "connection" | "application" | "ownership";

/** Map a signal type string to its corresponding layer. */
export function signalTypeToLayer(signalType: SignalType): Layer {
  switch (signalType) {
    case "recognition": return Layer.L1_SURFACE_RECOGNITION;
    case "explanation": return Layer.L2_ISOLATED_EXPLANATION;
    case "connection": return Layer.L3_CONTEXTUAL_CONNECTION;
    case "application": return Layer.L4_APPLIED_REASONING;
    case "ownership": return Layer.L5_FLUENT_OWNERSHIP;
  }
}

// ─── Layer constants ───────────────────────────────────────────────────────

/** Layer progression constants. */
export const LayerConstants = {
  MIN_CONNECTION_LAYER: Layer.L3_CONTEXTUAL_CONNECTION,
  MIN_REASONING_LAYER: Layer.L4_APPLIED_REASONING,
  MIN_OWNERSHIP_LAYER: Layer.L5_FLUENT_OWNERSHIP,
} as const;
