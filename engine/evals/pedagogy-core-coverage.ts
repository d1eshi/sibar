import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, relative, resolve } from "node:path";

import {
  Layer,
  LAYER_DESCRIPTIONS,
  MINIMUM_LAYER_FOR_TASK,
  QUESTION_COUNT_BY_SEVERITY,
  QUESTION_DEPTH_BY_LAYER,
  SIGNAL_RUBRIC,
  adaptQuestion,
  classifyGapSeverity,
  detectGaps,
  detectLayer,
  generateQuestions,
  getAllLayers,
  isUncertaintyDeclared,
  layerToNumber,
  observeSession,
  runPipeline,
  selectAnswerStyle,
  selectDepth,
  signalById,
  signalTypeToLayer,
  signalsForLayer,
  verifyAnswer,
  type EvidenceStream,
  type LayerDetection,
  type ObservedSignal,
} from "../pedagogy/index.ts";

const PEDAGOGY_CORE_COVERAGE_VALIDATION_ID = "VAL-EVAL-013-pedagogy-core-coverage";
const DEFAULT_REPORT = "evals/pedagogy-layers/reports/VAL-EVAL-013-pedagogy-core-coverage.json";
const EVAL_SPEC_PATH = "evals/pedagogy-layers/eval-suite.json";
export const PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT = "2026-05-20T00:00:00.000Z";

type CoreModule = "index" | "layers" | "questions" | "signals" | "pipeline";
type CoreScenario =
  | "layer_progression"
  | "signal_detection"
  | "question_adaptation"
  | "pipeline_gap_generation"
  | "answer_verification";

type CoreCoverageCase = {
  id: string;
  scenario: CoreScenario;
  modules: CoreModule[];
  assertions: string[];
};

export type PedagogyCoreCoverageReport = {
  report_id: string;
  generated_at: string;
  validation: typeof PEDAGOGY_CORE_COVERAGE_VALIDATION_ID;
  eval_spec_path: typeof EVAL_SPEC_PATH;
  no_llm: true;
  coverage_passed: boolean;
  aggregate: {
    total_cases: number;
    covered_modules: CoreModule[];
    covered_scenarios: CoreScenario[];
    generated_questions: number;
    detected_gaps: number;
  };
  cases: CoreCoverageCase[];
  observations: {
    layers: {
      all_layers: number[];
      task_minimums: Record<string, number>;
      signal_type_mapping: Record<string, number>;
    };
    signals: {
      catalog_layers: number[];
      detected_layers: Record<string, number | null>;
      lookup_signal: string;
    };
    questions: {
      depths_by_layer: Record<string, string>;
      answer_styles_by_layer: Record<string, string>;
      severity_examples: Record<string, string>;
      uncertainty_detected: boolean;
      adaptation: {
        detected_layer: number;
        severity: string;
        depth: string;
        answer_style: string;
        timing: string;
        question_count: [number, number];
      };
    };
    pipeline: {
      observation_tool_count: number;
      gap_order: string[];
      deliveries: string[];
      prompts: string[];
      verification_actions: string[];
      run_pipeline_question_count: number;
    };
  };
};

export type PedagogyCoreCoverageOptions = {
  reportPath?: string;
  generatedAt?: string;
  reportId?: string;
};

function toRepoRelative(filePath: string): string {
  const rel = relative(process.cwd(), resolve(filePath));
  return rel || ".";
}

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);
  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[spacedIndex + 1];
  return undefined;
}

function observed(signalId: string, evidence: string): ObservedSignal {
  const signal = signalById(signalId);
  if (!signal) throw new Error(`Unknown pedagogy signal: ${signalId}`);
  return {
    signalId,
    layer: signal.layer,
    confidence: signal.defaultConfidence,
    evidence,
    observedAt: PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT,
  };
}

function layerDetection(concept: string, signalIds: string[]): LayerDetection {
  const observedSignals = signalIds.map((signalId) => observed(signalId, `${concept} evidence ${signalId}`));
  const highestLayer = detectLayer(signalIds);
  if (highestLayer === null) throw new Error(`No layer detected for ${concept}`);
  const confidenceOrder = ["low", "medium", "high"] as const;
  const averageConfidence = observedSignals
    .map((signal) => signal.confidence)
    .sort((a, b) => confidenceOrder.indexOf(b) - confidenceOrder.indexOf(a))[0]!;
  return {
    concept,
    highestLayer,
    averageConfidence,
    observedSignals,
  };
}

export function runPedagogyCoreCoverageEval(
  options: PedagogyCoreCoverageOptions = {},
): PedagogyCoreCoverageReport {
  const allLayers = getAllLayers();
  const layersPass =
    allLayers.length === 5
    && allLayers.every((layer) => layerToNumber(layer) === layer)
    && LAYER_DESCRIPTIONS[Layer.L5_FLUENT_OWNERSHIP].signalCategory === "ownership"
    && MINIMUM_LAYER_FOR_TASK["review-architecture"] === Layer.L5_FLUENT_OWNERSHIP
    && signalTypeToLayer("application") === Layer.L4_APPLIED_REASONING;

  const signalCatalogLayers = allLayers.filter((layer) => signalsForLayer(layer).length > 0);
  const detectedLayers = {
    l1: detectLayer(["S1.1"]),
    l3_prefers_high_over_lower: detectLayer(["S1.1", "S3.2"]),
    ignores_low_only: detectLayer(["S2.4"]),
    l4_medium_fallback: detectLayer(["S4.3"]),
  };
  const signalsPass =
    SIGNAL_RUBRIC[Layer.L3_CONTEXTUAL_CONNECTION].some((signal) => signal.id === "S3.2")
    && signalById("S4.1")?.evidenceSource === "risk_analysis"
    && detectedLayers.l3_prefers_high_over_lower === Layer.L3_CONTEXTUAL_CONNECTION
    && detectedLayers.ignores_low_only === null
    && detectedLayers.l4_medium_fallback === Layer.L4_APPLIED_REASONING;

  const adaptation = adaptQuestion(
    Layer.L3_CONTEXTUAL_CONNECTION,
    "important",
    "engine/pedagogy/pipeline.ts",
    ["User traced a flow but could not reason about failure impact."],
  );
  const depthsByLayer = Object.fromEntries(allLayers.map((layer) => [`L${layer}`, selectDepth(layer)]));
  const answerStylesByLayer = Object.fromEntries(allLayers.map((layer) => [`L${layer}`, selectAnswerStyle(layer)]));
  const severityExamples = {
    critical: classifyGapSeverity(Layer.L1_SURFACE_RECOGNITION, Layer.L4_APPLIED_REASONING),
    important: classifyGapSeverity(Layer.L2_ISOLATED_EXPLANATION, Layer.L4_APPLIED_REASONING),
    later: classifyGapSeverity(Layer.L4_APPLIED_REASONING, Layer.L5_FLUENT_OWNERSHIP),
  };
  const questionsPass =
    QUESTION_DEPTH_BY_LAYER[Layer.L4_APPLIED_REASONING].depth === "challenging"
    && QUESTION_COUNT_BY_SEVERITY.important.timing === "deferred"
    && adaptation.answerStyle === "risk_analysis"
    && adaptation.depth === "applying"
    && isUncertaintyDeclared("Tengo dudas sobre este boundary")
    && severityExamples.critical === "critical"
    && severityExamples.important === "important"
    && severityExamples.later === "later";

  const concepts = [
    layerDetection("engine/pedagogy/layers.ts", ["S2.1"]),
    layerDetection("engine/pedagogy/questions.ts", ["S1.1"]),
    layerDetection("engine/pedagogy/signals.ts", ["S4.1"]),
  ];
  const gaps = detectGaps(concepts, "review-architecture");
  const questions = generateQuestions(gaps, "core-coverage-session", 1);
  const evidenceStream: EvidenceStream = observeSession(
    {
      intent_id: "intent-core-coverage",
      created_at: PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT,
      project_label: "sibar",
      statement: "Review pedagogy core coverage directly.",
      uncertainty: "Need proof that core modules are exercised.",
      desired_help: "find_gaps",
    },
    [{ timestamp: PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT, tool: "node:test", detail: "pedagogy core coverage" }],
    [observed("S3.2", "User identified the core module boundary.")],
    [],
  );
  const pipelineResult = runPipeline(evidenceStream, concepts, "review-architecture", "core-coverage-session");
  const verificationActions = [
    verifyAnswer(Layer.L2_ISOLATED_EXPLANATION, Layer.L3_CONTEXTUAL_CONNECTION, "verified").action.type,
    verifyAnswer(Layer.L3_CONTEXTUAL_CONNECTION, Layer.L4_APPLIED_REASONING, "partial").action.type,
    verifyAnswer(Layer.L3_CONTEXTUAL_CONNECTION, Layer.L4_APPLIED_REASONING, "gap_confirmed").action.type,
    verifyAnswer(Layer.L3_CONTEXTUAL_CONNECTION, Layer.L4_APPLIED_REASONING, "uncertainty_declared").action.type,
  ];
  const pipelinePass =
    evidenceStream.toolObservations.length === 1
    && gaps.length === 3
    && gaps[0]?.severity === "critical"
    && gaps.some((gap) => gap.severity === "later")
    && questions.length === gaps.length
    && questions.filter((question) => question.delivery === "immediate").length === 1
    && questions.some((question) => question.question.prompt.includes("walk me through"))
    && pipelineResult.questions.length === gaps.length
    && verificationActions.join(",") === "advance,connect,drop_and_orient,respect_boundary";

  const cases: CoreCoverageCase[] = [
    {
      id: "CORE-001-LAYER-PROGRESSION",
      scenario: "layer_progression",
      modules: ["index", "layers"],
      assertions: [
        "getAllLayers returns L1-L5 in order",
        "task minimums require L5 for architecture review",
        "signalTypeToLayer maps application to L4",
      ],
    },
    {
      id: "CORE-002-SIGNAL-DETECTION",
      scenario: "signal_detection",
      modules: ["index", "signals"],
      assertions: [
        "signal catalog exposes entries for every layer",
        "detectLayer prefers the highest high-confidence signal",
        "low-confidence-only observations do not classify a layer",
      ],
    },
    {
      id: "CORE-003-QUESTION-ADAPTATION",
      scenario: "question_adaptation",
      modules: ["index", "questions"],
      assertions: [
        "adaptQuestion selects depth, timing, count, and answer style",
        "classifyGapSeverity covers critical, important, and later",
        "isUncertaintyDeclared detects explicit Spanish uncertainty",
      ],
    },
    {
      id: "CORE-004-PIPELINE-GAP-GENERATION",
      scenario: "pipeline_gap_generation",
      modules: ["index", "pipeline", "layers", "questions", "signals"],
      assertions: [
        "observeSession records tool evidence",
        "detectGaps ranks critical gaps before later gaps",
        "generateQuestions and runPipeline create ownership questions from real gaps",
      ],
    },
    {
      id: "CORE-005-ANSWER-VERIFICATION",
      scenario: "answer_verification",
      modules: ["index", "pipeline"],
      assertions: [
        "verifyAnswer emits every verification action branch",
      ],
    },
  ];

  const coveredModules = Array.from(new Set(cases.flatMap((testCase) => testCase.modules))).sort() as CoreModule[];
  const coveredScenarios = Array.from(new Set(cases.map((testCase) => testCase.scenario))).sort() as CoreScenario[];
  const coveragePassed =
    layersPass
    && signalsPass
    && questionsPass
    && pipelinePass
    && coveredModules.join(",") === "index,layers,pipeline,questions,signals";
  const generatedAt = options.generatedAt ?? PEDAGOGY_CORE_COVERAGE_EVAL_GENERATED_AT;
  const report: PedagogyCoreCoverageReport = {
    report_id: options.reportId ?? `${PEDAGOGY_CORE_COVERAGE_VALIDATION_ID}-${generatedAt}`,
    generated_at: generatedAt,
    validation: PEDAGOGY_CORE_COVERAGE_VALIDATION_ID,
    eval_spec_path: EVAL_SPEC_PATH,
    no_llm: true,
    coverage_passed: coveragePassed,
    aggregate: {
      total_cases: cases.length,
      covered_modules: coveredModules,
      covered_scenarios: coveredScenarios,
      generated_questions: questions.length,
      detected_gaps: gaps.length,
    },
    cases,
    observations: {
      layers: {
        all_layers: allLayers,
        task_minimums: {
          "make-small-change": MINIMUM_LAYER_FOR_TASK["make-small-change"],
          "review-architecture": MINIMUM_LAYER_FOR_TASK["review-architecture"],
        },
        signal_type_mapping: {
          recognition: signalTypeToLayer("recognition"),
          application: signalTypeToLayer("application"),
          ownership: signalTypeToLayer("ownership"),
        },
      },
      signals: {
        catalog_layers: signalCatalogLayers,
        detected_layers: detectedLayers,
        lookup_signal: signalById("S4.1")?.id ?? "<missing>",
      },
      questions: {
        depths_by_layer: depthsByLayer,
        answer_styles_by_layer: answerStylesByLayer,
        severity_examples: severityExamples,
        uncertainty_detected: isUncertaintyDeclared("Tengo dudas sobre este boundary"),
        adaptation: {
          detected_layer: adaptation.detectedLayer,
          severity: adaptation.severity,
          depth: adaptation.depth,
          answer_style: adaptation.answerStyle,
          timing: adaptation.timing,
          question_count: adaptation.questionCount,
        },
      },
      pipeline: {
        observation_tool_count: evidenceStream.toolObservations.length,
        gap_order: gaps.map((gap) => `${gap.concept}:${gap.severity}`),
        deliveries: questions.map((question) => question.delivery),
        prompts: questions.map((question) => question.question.prompt),
        verification_actions: verificationActions,
        run_pipeline_question_count: pipelineResult.questions.length,
      },
    },
  };

  const outputPath = resolve(options.reportPath ?? DEFAULT_REPORT);
  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return {
    ...report,
    eval_spec_path: toRepoRelative(EVAL_SPEC_PATH) as typeof EVAL_SPEC_PATH,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const reportArg = getFlagValue(process.argv, "report");
  const report = runPedagogyCoreCoverageEval({ reportPath: reportArg });
  process.stdout.write(JSON.stringify({
    coverage_passed: report.coverage_passed,
    aggregate: report.aggregate,
  }, null, 2));
  process.stdout.write("\n");
  if (!existsSync(resolve(reportArg ?? DEFAULT_REPORT)) || !report.coverage_passed) {
    process.exitCode = 1;
  }
}
