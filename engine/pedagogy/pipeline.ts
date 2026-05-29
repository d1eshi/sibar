/**
 * §6 — The Full Pipeline
 *
 * Observation → Gap Detection → Question Generation → Learning Verification
 *
 * @see docs/research/pedagogical_layers.md §6
 */

import { Layer, type SignalType, type TaskType, MINIMUM_LAYER_FOR_TASK } from "./layers.ts";
import {
  type ObservedSignal,
  type LayerDetection,
  detectLayer,
} from "./signals.ts";
import {
  type GapSeverity,
  type AnswerStyle,
  type QuestionDepth,
  type QuestionAdaptation,
  adaptQuestion,
  classifyGapSeverity,
} from "./questions.ts";
import { layerToNumber } from "./layers.ts";

// ─── Contract Types (from 03_learning_signal_contract.md) ──────────────────

/** @see docs/product/03_learning_signal_contract.md */
export type DeclaredWorkIntent = {
  intent_id: string;
  created_at: string;
  project_label: string;
  project_path?: string | null;
  statement: string;
  uncertainty: string;
  expected_work_area?: string | null;
  desired_help: "explain_system" | "find_gaps" | "generate_questions" | "prepare_study_plan";
};

/** @see docs/product/03_learning_signal_contract.md */
export type LearningSignal = {
  signal_id: string;
  created_at: string;
  source: "observer" | "user_declared_intent" | "process_inference" | "ownership_question";
  project_label: string;
  project_path?: string | null;
  concept_or_area: string;
  reason: string;
  evidence: string[];
  severity: "critical" | "important" | "later";
  confidence: "low" | "medium" | "high";
};

/** @see docs/product/03_learning_signal_contract.md */
export type OwnershipQuestion = {
  question_id: string;
  created_at: string;
  session_id: string;
  prompt: string;
  target_area: string;
  why_it_matters: string;
  evidence_basis: string[];
  answer_style: "short_explanation" | "system_walkthrough" | "risk_analysis" | "boundary_explanation" | "study_request";
};

/** @see docs/product/03_learning_signal_contract.md */
export type AgentWorkSessionSummary = {
  session_id: string;
  project_label: string;
  started_at: string;
  ended_at?: string | null;
  declared_intent?: DeclaredWorkIntent | null;
  observed_tools: string[];
  learning_signals: LearningSignal[];
  ownership_questions: OwnershipQuestion[];
  export_state: "not_exported" | "ready_for_review" | "exported";
};

// ─── Stage 1 — Observation (§6.1) ──────────────────────────────────────────

/**
 * Raw evidence collected during observation.
 *
 * §6.1 — Inputs: declared work intent, tool observation, explicit user signals,
 * previous session summaries.
 * Outputs: raw evidence stream.
 */
export interface EvidenceStream {
  /** ISO timestamp when the observation window started. */
  observationStart: string;
  /** ISO timestamp when the observation window ended. */
  observationEnd: string;
  /** Declared work intent from the user. */
  declaredIntent: DeclaredWorkIntent | null;
  /** Tools observed being used (file paths opened, commands run, searches). */
  toolObservations: ToolObservation[];
  /** Explicit signals captured from the user. */
  explicitSignals: ObservedSignal[];
  /** Previous session summaries for context. */
  previousSessions: AgentWorkSessionSummary[];
}

/** A single tool observation event. */
export interface ToolObservation {
  /** ISO timestamp. */
  timestamp: string;
  /** The tool or action observed. */
  tool: string;
  /** File path, command, or search query. */
  detail: string;
}

/**
 * §6.1 — Collect raw evidence from the observed session.
 */
export function observeSession(
  declaredIntent: DeclaredWorkIntent | null,
  toolObservations: ToolObservation[],
  explicitSignals: ObservedSignal[],
  previousSessions: AgentWorkSessionSummary[],
): EvidenceStream {
  const now = new Date().toISOString();
  return {
    observationStart: previousSessions.length > 0
      ? previousSessions[previousSessions.length - 1].ended_at ?? now
      : now,
    observationEnd: now,
    declaredIntent,
    toolObservations,
    explicitSignals,
    previousSessions,
  };
}

// ─── Stage 2 — Gap Detection (§6.2) ────────────────────────────────────────

/**
 * A detected learning gap.
 *
 * §6.2 — A gap is a discrepancy between the signals observed and the layer
 * sibi expected for the user's declared work intent.
 */
export interface DetectedGap {
  /** The concept or area where the gap was detected. */
  concept: string;
  /** The layer detected from observed signals. */
  detectedLayer: Layer;
  /** The minimum layer required for the declared task type. */
  requiredLayer: Layer;
  /** Gap severity classification. */
  severity: GapSeverity;
  /** Confidence in the gap detection. */
  confidence: "low" | "medium" | "high";
  /** Evidence supporting the gap detection. */
  evidence: string[];
  /** The layer detection result for traceability. */
  layerDetection: LayerDetection;
}

/**
 * §6.2 — Detect gaps by comparing observed signal layers to the minimum
 * required layer for the declared task.
 *
 * Process:
 * 1. Map current work to known concepts.
 * 2. Compare observed signal layer to minimum required layer.
 * 3. Classify each gap by severity.
 * 4. Filter gaps: only surface gaps where confidence is medium or high.
 */
export function detectGaps(
  concepts: LayerDetection[],
  taskType: TaskType,
): DetectedGap[] {
  const requiredLayer = MINIMUM_LAYER_FOR_TASK[taskType];
  const gaps: DetectedGap[] = [];

  for (const detection of concepts) {
    const detectedNum = layerToNumber(detection.highestLayer);
    const requiredNum = layerToNumber(requiredLayer);

    // Only create a gap if observed layer is below required
    if (detectedNum >= requiredNum) continue;

    // §4 — Only surface gaps where confidence is medium or high
    if (detection.averageConfidence === "low") continue;

    const severity = classifyGapSeverity(detection.highestLayer, requiredLayer);

    gaps.push({
      concept: detection.concept,
      detectedLayer: detection.highestLayer,
      requiredLayer,
      severity,
      confidence: detection.averageConfidence,
      evidence: detection.observedSignals.map((s) => s.evidence),
      layerDetection: detection,
    });
  }

  // §6.2 — Output: ranked list, ordered by severity (critical first)
  gaps.sort((a, b) => {
    const order: Record<GapSeverity, number> = {
      critical: 0,
      important: 1,
      later: 2,
    };
    return order[a.severity] - order[b.severity];
  });

  return gaps;
}

// ─── Stage 3 — Question Generation (§6.3) ──────────────────────────────────

/**
 * A generated question with its adaptation context.
 *
 * §6.3 — Output: a set of OwnershipQuestion entries, some immediate, some queued.
 */
export interface GeneratedQuestion {
  /** The OwnershipQuestion entry. */
  question: OwnershipQuestion;
  /** Whether this question is immediate or queued. */
  delivery: "immediate" | "queued";
  /** The adaptation parameters used for generation. */
  adaptation: QuestionAdaptation;
}

/**
 * §6.3 — Generate diagnostic questions from detected gaps.
 *
 * Process:
 * 1. Select highest-severity gap(s) that fit current work context.
 * 2. Choose question depth based on detected layer (§5.1).
 * 3. Choose answer style based on gap type (§5.4).
 * 4. Generate OwnershipQuestion entries with why_it_matters and evidence_basis.
 * 5. Buffer questions that exceed current timing window into the study plan.
 *
 * @param gaps - Ranked list of detected gaps.
 * @param sessionId - Current session identifier.
 * @param maxImmediateQuestions - Max immediate questions to generate (default 5).
 * @returns List of generated questions with delivery timing.
 */
export function generateQuestions(
  gaps: DetectedGap[],
  sessionId: string,
  maxImmediateQuestions = 5,
): GeneratedQuestion[] {
  const results: GeneratedQuestion[] = [];
  let immediateCount = 0;

  for (const gap of gaps) {
    const adaptation = adaptQuestion(
      gap.detectedLayer,
      gap.severity,
      gap.concept,
      gap.evidence,
    );

    // Determine delivery based on timing and current immediate budget
    let delivery: "immediate" | "queued";
    if (adaptation.timing === "immediate" && immediateCount < maxImmediateQuestions) {
      delivery = "immediate";
      immediateCount++;
    } else {
      delivery = "queued";
    }

    const question: OwnershipQuestion = {
      question_id: `q-${sessionId}-${gap.concept}-${Date.now()}`,
      created_at: new Date().toISOString(),
      session_id: sessionId,
      prompt: buildQuestionPrompt(gap, adaptation),
      target_area: gap.concept,
      why_it_matters: buildWhyItMatters(gap),
      evidence_basis: gap.evidence,
      answer_style: adaptation.answerStyle,
    };

    results.push({ question, delivery, adaptation });
  }

  return results;
}

/** Build a prompt string for a question based on the gap and adaptation. */
function buildQuestionPrompt(gap: DetectedGap, adaptation: QuestionAdaptation): string {
  const depthInfo = adaptation.depth;
  const style = adaptation.answerStyle;

  const base = `Based on your work in "${gap.concept}", `;

  switch (style) {
    case "short_explanation":
      return `${base}can you explain in one or two sentences what this area does?`;
    case "system_walkthrough":
      return `${base}can you walk me through how this connects to the rest of the system?`;
    case "risk_analysis":
      return `${base}what is the riskiest thing that could break if you change this?`;
    case "boundary_explanation":
      return `${base}which component owns this responsibility, and what are its boundaries?`;
    case "study_request":
      return `${base}what would you need to study to feel confident about this area?`;
  }
}

/** Build a "why it matters" justification for a question. */
function buildWhyItMatters(gap: DetectedGap): string {
  const detectedName = gap.detectedLayer;
  const requiredName = gap.requiredLayer;

  return (
    `Your current task requires ${requiredName}-level understanding of "${gap.concept}", ` +
    `but observed signals suggest ${detectedName}-level. ` +
    `Understanding this boundary will help you work more safely and confidently.`
  );
}

// ─── Stage 4 — Learning Verification (§6.4, §6.5) ──────────────────────────

/**
 * Quality assessment of a user's answer to an ownership question.
 *
 * §6.5 — Verification Signal Mapping.
 */
export type AnswerQuality = "verified" | "partial" | "gap_confirmed" | "uncertainty_declared";

/**
 * Result of verifying a user's answer against the expected layer.
 *
 * §6.4, §6.5 — Process: extract answer signals, compare to expected signals,
 * update concept-layer map.
 */
export interface VerificationResult {
  /** The question that was answered. */
  question: OwnershipQuestion;
  /** The assessed quality of the answer. */
  quality: AnswerQuality;
  /** Updated layer for this concept after verification. */
  newLayer: Layer;
  /** Whether the concept is now considered verified at its target layer. */
  verified: boolean;
  /** Follow-up action to take. */
  action: VerificationAction;
}

/** §6.5 — Action to take after verification. */
export type VerificationAction =
  | { type: "advance"; message: string }
  | { type: "connect"; message: string }
  | { type: "drop_and_orient"; message: string }
  | { type: "respect_boundary"; message: string };

/**
 * §6.4, §6.5 — Verify a user's answer to an ownership question.
 *
 * Process:
 * 1. Extract answer signals and compare to expected signals.
 * 2. If signals match/exceed target: mark verified, advance layer.
 * 3. If signals fall below: generate follow-up at one layer lower.
 * 4. Update concept-layer map.
 *
 * @param currentLayer - The current layer for the concept.
 * @param targetLayer - The target layer the question was testing.
 * @param answerQuality - Assessed quality of the answer.
 * @returns Verification result with updated layer and action.
 */
export function verifyAnswer(
  currentLayer: Layer,
  targetLayer: Layer,
  answerQuality: AnswerQuality,
): VerificationResult {
  const allLayers = [
    Layer.L1_SURFACE_RECOGNITION,
    Layer.L2_ISOLATED_EXPLANATION,
    Layer.L3_CONTEXTUAL_CONNECTION,
    Layer.L4_APPLIED_REASONING,
    Layer.L5_FLUENT_OWNERSHIP,
  ];

  const currentNum = layerToNumber(currentLayer);
  const targetNum = layerToNumber(targetLayer);

  switch (answerQuality) {
    case "verified": {
      // §6.4 bullet 2: advance concept layer, reduce question frequency
      const newNum = Math.min(currentNum + 1, 5);
      return {
        question: null as unknown as OwnershipQuestion, // filled by caller
        quality: "verified",
        newLayer: allLayers[newNum - 1],
        verified: true,
        action: {
          type: "advance",
          message:
            "Great! Your answer shows confident understanding with system-level connections. Moving this concept forward.",
        },
      };
    }

    case "partial": {
      // §6.4 bullet 2 (alt): keep at current layer, generate connecting question
      return {
        question: null as unknown as OwnershipQuestion,
        quality: "partial",
        newLayer: currentLayer,
        verified: false,
        action: {
          type: "connect",
          message:
            "Good explanation in isolation. Let's connect this to the broader system with a follow-up question.",
        },
      };
    }

    case "gap_confirmed": {
      // §6.4 bullet 3: drop one layer, generate orienting question
      const newNum = Math.max(currentNum - 1, 1);
      return {
        question: null as unknown as OwnershipQuestion,
        quality: "gap_confirmed",
        newLayer: allLayers[newNum - 1],
        verified: false,
        action: {
          type: "drop_and_orient",
          message:
            "No worries — let's step back and build a stronger foundation before going deeper.",
        },
      };
    }

    case "uncertainty_declared": {
      // §6.4 bullet 4: respect boundary, add to study plan
      return {
        question: null as unknown as OwnershipQuestion,
        quality: "uncertainty_declared",
        newLayer: currentLayer,
        verified: false,
        action: {
          type: "respect_boundary",
          message:
            "Understood. This area has been added to your study plan. We'll revisit when you're ready.",
        },
      };
    }
  }
}

// ─── Pipeline Orchestration (§6) ───────────────────────────────────────────

/**
 * §6 — Full pipeline result from observation through question generation.
 */
export interface PipelineResult {
  /** The evidence stream collected. */
  evidenceStream: EvidenceStream;
  /** Detected layer detections per concept. */
  layerDetections: LayerDetection[];
  /** Detected gaps ranked by severity. */
  gaps: DetectedGap[];
  /** Generated questions. */
  questions: GeneratedQuestion[];
}

/**
 * §6 — Run the full observation → gap detection → question generation pipeline.
 *
 * This is the main entry point: feed in observations, get back questions.
 *
 * @param evidenceStream - Raw evidence from the observation stage.
 * @param concepts - Concept-layer map from prior sessions.
 * @param taskType - The type of task the user is working on.
 * @param sessionId - Current session identifier.
 * @returns Full pipeline result.
 */
export function runPipeline(
  evidenceStream: EvidenceStream,
  concepts: LayerDetection[],
  taskType: TaskType,
  sessionId: string,
): PipelineResult {
  // §6.2 — Gap Detection
  const gaps = detectGaps(concepts, taskType);

  // §6.3 — Question Generation
  const questions = generateQuestions(gaps, sessionId);

  return {
    evidenceStream,
    layerDetections: concepts,
    gaps,
    questions,
  };
}
