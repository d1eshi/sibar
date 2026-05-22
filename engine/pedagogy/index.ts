/**
 * Sibi Pedagogy Layer Module
 */

export {
  Layer,
  LAYER_DESCRIPTIONS,
  MINIMUM_LAYER_FOR_TASK,
  signalTypeToLayer,
  getAllLayers,
  layerToNumber,
} from "./layers.ts";
export type {
  LayerDescriptor,
  SignalType,
  TaskType,
} from "./layers.ts";

export {
  SIGNAL_RUBRIC,
  detectLayer,
  signalsForLayer,
  signalById,
} from "./signals.ts";
export type {
  Confidence,
  EvidenceSource,
  SignalDefinition,
  ObservedSignal,
  LayerDetection,
} from "./signals.ts";

export {
  QUESTION_DEPTH_BY_LAYER,
  QUESTION_COUNT_BY_SEVERITY,
  ANSWER_STYLE_RULES,
  FRAMING_RULES,
  adaptQuestion,
  selectDepth,
  selectAnswerStyle,
  classifyGapSeverity,
  isUncertaintyDeclared,
} from "./questions.ts";
export type {
  GapSeverity,
  AnswerStyle,
  QuestionDepth,
  DepthRule,
  CountRule,
  AnswerStyleRule,
  QuestionAdaptation,
} from "./questions.ts";

export {
  observeSession,
  detectGaps,
  generateQuestions,
  verifyAnswer,
  runPipeline,
} from "./pipeline.ts";
export type {
  DeclaredWorkIntent,
  LearningSignal,
  OwnershipQuestion,
  AgentWorkSessionSummary,
  EvidenceStream,
  ToolObservation,
  DetectedGap,
  GeneratedQuestion,
  AnswerQuality,
  VerificationResult,
  VerificationAction,
  PipelineResult,
} from "./pipeline.ts";
