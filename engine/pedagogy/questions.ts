/**
 * §5 — Question Adaptation Rules
 *
 * Sibi adapts question generation along four axes based on the detected gap layer.
 * Questions must never sound like a test or interrogation.
 *
 * @see docs/research/pedagogical_layers.md §5
 */

import { Layer, layerToNumber } from "./layers.ts";
import type { Confidence } from "./signals.ts";

// ─── Severity (§4) ─────────────────────────────────────────────────────────

/**
 * Gap severity — the urgency of addressing a detected gap.
 * @see §4 Gap Detection: From Signal to Gap
 */
export type GapSeverity = "critical" | "important" | "later";

// ─── Answer Style (§5.4) ───────────────────────────────────────────────────

/** Answer style determines the format of the question's expected answer. */
export type AnswerStyle =
  | "short_explanation"
  | "system_walkthrough"
  | "risk_analysis"
  | "boundary_explanation"
  | "study_request";

// ─── Question Depth (§5.1) ─────────────────────────────────────────────────

/** The pedagogical depth tier for a question. */
export type QuestionDepth =
  | "orienting"
  | "connecting"
  | "applying"
  | "challenging"
  | "metacognitive";

/**
 * §5.1 — Question depth by detected layer.
 *
 * Maps each layer to the appropriate depth tier and provides
 * example framing for question generation.
 */
export interface DepthRule {
  depth: QuestionDepth;
  /** Description of the question approach at this depth. */
  description: string;
  /** Example framing for questions at this depth. */
  exampleFraming: string;
}

export const QUESTION_DEPTH_BY_LAYER: Record<Layer, DepthRule> = {
  [Layer.L1_SURFACE_RECOGNITION]: {
    depth: "orienting",
    description: "Surface-level, definitional questions.",
    exampleFraming: "Can you find where X is defined in this repo?",
  },
  [Layer.L2_ISOLATED_EXPLANATION]: {
    depth: "connecting",
    description: "Bridges isolated knowledge to context.",
    exampleFraming: "What other component depends on this? Why?",
  },
  [Layer.L3_CONTEXTUAL_CONNECTION]: {
    depth: "applying",
    description: "Tests reasoning under change.",
    exampleFraming: "If you removed this boundary, what would fail?",
  },
  [Layer.L4_APPLIED_REASONING]: {
    depth: "challenging",
    description: "Tests design judgment.",
    exampleFraming:
      "Is this the right abstraction? What alternative would work?",
  },
  [Layer.L5_FLUENT_OWNERSHIP]: {
    depth: "metacognitive",
    description: "Tests teaching and transfer.",
    exampleFraming:
      "How would you explain this design to a new team member?",
  },
};

// ─── Question Count (§5.2) ─────────────────────────────────────────────────

/**
 * §5.2 — Question count and timing by gap severity.
 */
export interface CountRule {
  /** Number of questions to generate. */
  questionCount: [number, number]; // [min, max]
  /** When to deliver the questions. */
  timing: "immediate" | "deferred" | "queued";
  /** Human-readable timing description. */
  timingDescription: string;
}

export const QUESTION_COUNT_BY_SEVERITY: Record<GapSeverity, CountRule> = {
  critical: {
    questionCount: [3, 5],
    timing: "immediate",
    timingDescription: "Before the user proceeds with the task",
  },
  important: {
    questionCount: [1, 3],
    timing: "deferred",
    timingDescription: "At the next natural pause in work",
  },
  later: {
    questionCount: [1, 1],
    timing: "queued",
    timingDescription: "Added to study plan, not injected into current flow",
  },
};

// ─── Answer Style Selection (§5.4) ─────────────────────────────────────────

/** §5.4 — Maps answer styles to their usage conditions and example prompts. */
export interface AnswerStyleRule {
  style: AnswerStyle;
  /** When this style is used. */
  whenUsed: string;
  /** Example prompt that invokes this style. */
  examplePrompt: string;
}

export const ANSWER_STYLE_RULES: AnswerStyleRule[] = [
  {
    style: "short_explanation",
    whenUsed: "Quick diagnostic, L1-L2 signals",
    examplePrompt: "In one sentence, what does this module do?",
  },
  {
    style: "system_walkthrough",
    whenUsed: "Tracing flows, L2-L3 signals",
    examplePrompt:
      "Walk me from the HTTP request to the database response.",
  },
  {
    style: "risk_analysis",
    whenUsed: "Safety-critical, L3-L4 signals",
    examplePrompt:
      "What is the worst thing that could break if you change this?",
  },
  {
    style: "boundary_explanation",
    whenUsed: "Architecture, L3-L5 signals",
    examplePrompt:
      "Which component owns this responsibility and why?",
  },
  {
    style: "study_request",
    whenUsed: "Explicit uncertainty, any layer",
    examplePrompt:
      "What would you need to learn before you'd feel confident here?",
  },
];

// ─── Framing Rules (§5.3) ──────────────────────────────────────────────────

/**
 * §5.3 — Framing rules that must be applied to all generated questions.
 *
 * 1. Questions must never sound like a test or interrogation.
 * 2. Prefer "can you walk me through..." over "do you know...".
 * 3. Always include *why the question matters* for the current task.
 * 4. If the user answers incorrectly, do not say "wrong". Say "let's explore that together".
 * 5. Questions originate from declared uncertainty and observed evidence,
 *    never from hidden mastery assumptions.
 */
export const FRAMING_RULES: string[] = [
  "Questions must never sound like a test or interrogation.",
  'Prefer "can you walk me through..." over "do you know...".',
  "Always include why the question matters for the current task.",
  'If the user answers incorrectly, do not say "wrong". Say "let\'s explore that together".',
  "Questions originate from declared uncertainty and observed evidence, never from hidden mastery assumptions.",
];

// ─── Question Adapter ──────────────────────────────────────────────────────

/**
 * Parameters for adapting question generation.
 */
export interface QuestionAdaptation {
  /** The detected layer for the target concept. */
  detectedLayer: Layer;
  /** The severity of the gap. */
  severity: GapSeverity;
  /** The target area or concept. */
  targetArea: string;
  /** Evidence basis for why this question is being asked. */
  evidenceBasis: string[];
  /** The answer style to request. */
  answerStyle: AnswerStyle;
  /** Question count range [min, max]. */
  questionCount: [number, number];
  /** Timing for delivery. */
  timing: "immediate" | "deferred" | "queued";
  /** The depth tier for generated questions. */
  depth: QuestionDepth;
}

/**
 * §5 — Adapt question generation parameters based on detected layer
 * and gap severity.
 *
 * @param detectedLayer - The layer detected for the target concept.
 * @param severity - The gap severity.
 * @param targetArea - The concept or area the question targets.
 * @param evidenceBasis - Evidence strings that justify this question.
 * @returns Fully adapted question generation parameters.
 */
export function adaptQuestion(
  detectedLayer: Layer,
  severity: GapSeverity,
  targetArea: string,
  evidenceBasis: string[],
): QuestionAdaptation {
  const depthRule = QUESTION_DEPTH_BY_LAYER[detectedLayer];
  const countRule = QUESTION_COUNT_BY_SEVERITY[severity];

  // §5.4 — Select answer style based on layer range
  const answerStyle = selectAnswerStyle(detectedLayer);

  return {
    detectedLayer,
    severity,
    targetArea,
    evidenceBasis,
    answerStyle,
    questionCount: countRule.questionCount,
    timing: countRule.timing,
    depth: depthRule.depth,
  };
}

/**
 * §5.4 — Select the answer style based on the detected layer.
 *
 * - L1-L2 → short_explanation
 * - L2-L3 → system_walkthrough
 * - L3-L4 → risk_analysis
 * - L3-L5 → boundary_explanation
 * - Any layer with explicit uncertainty → study_request
 */
/**
 * §5.1 — Select the question depth tier for a given layer.
 *
 * Returns the {@link QuestionDepth} associated with the layer's
 * {@link QUESTION_DEPTH_BY_LAYER} entry.
 */
export function selectDepth(layer: Layer): QuestionDepth {
  return QUESTION_DEPTH_BY_LAYER[layer].depth;
}

/**
 * §5.4 — Select the answer style based on the detected layer.
 *
 * - L1-L2 → short_explanation
 * - L2-L3 → system_walkthrough
 * - L3-L4 → risk_analysis
 * - L3-L5 → boundary_explanation
 * - Any layer with explicit uncertainty → study_request
 */
export function selectAnswerStyle(detectedLayer: Layer): AnswerStyle {
  switch (detectedLayer) {
    case Layer.L1_SURFACE_RECOGNITION:
      return "short_explanation";
    case Layer.L2_ISOLATED_EXPLANATION:
      return "system_walkthrough";
    case Layer.L3_CONTEXTUAL_CONNECTION:
      return "risk_analysis";
    case Layer.L4_APPLIED_REASONING:
      return "boundary_explanation";
    case Layer.L5_FLUENT_OWNERSHIP:
      return "boundary_explanation";
  }
}

// ─── Gap Detection Helpers (§4) ────────────────────────────────────────────

/**
 * §4.1 — Gap detection trigger: the user explicitly declares uncertainty.
 *
 * When the user says "tengo dudas" or equivalent, this is always treated
 * as a gap trigger regardless of other signals.
 */
export function isUncertaintyDeclared(statement: string): boolean {
  const uncertaintyMarkers = [
    "tengo dudas",
    "i have doubts",
    "not sure",
    "confused",
    "unclear",
    "don't understand",
    "no entiendo",
  ];
  const lower = statement.toLowerCase();
  return uncertaintyMarkers.some((m) => lower.includes(m));
}

/**
 * §4 — Classify the severity of a gap based on the difference between
 * the detected layer and the minimum required layer for a task.
 *
 * @param detectedLayer - The layer detected from signals.
 * @param requiredLayer - The minimum layer needed for the task.
 * @returns The gap severity classification.
 */
export function classifyGapSeverity(
  detectedLayer: Layer,
  requiredLayer: Layer,
): GapSeverity {
  const detected = layerToNumber(detectedLayer);
  const required = layerToNumber(requiredLayer);
  const diff = required - detected;

  if (diff >= 3) return "critical";
  if (diff >= 2) return "important";
  return "later";
}
