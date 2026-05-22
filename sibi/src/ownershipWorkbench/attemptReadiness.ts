import type {
  EvidenceRef,
  EvidenceConfidence,
  OwnershipAttemptGap,
  OwnershipAttemptReadiness,
  OwnershipBoundary,
  ReadinessGate,
} from "./types";
import { evaluateAttempt } from "./helpers.ts";

type ReadinessInput = {
  attemptText: string;
  boundary: OwnershipBoundary;
  selfConfidence: number;
  attemptIndex: number;
  startedAt: number;
  submittedAt?: number;
  now?: () => number;
};

const OWNED_CONFIDENCE_GATE = 0.85;
const OWNED_CALIBRATION_GATE = 0.6;
const MIN_EVIDENCE_FIT_TO_START = 0.2;
const OWNED_EVIDENCE_FIT_GATE = 0.45;

function fallbackEvidence(boundary: OwnershipBoundary): EvidenceRef[] {
  return [
    {
      id: `anchor-${boundary.id}`,
      title: "Boundary anchor",
      detail: boundary.title,
      location: `${boundary.filePath}:${boundary.startLine}-${boundary.endLine}`,
      confidence: "unverified",
    },
  ];
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function normalizeConfidence(value: number): number {
  return clamp01(value / 100);
}

function evidenceConfidenceRank(confidence: EvidenceConfidence): number {
  if (confidence === "observed") return 4;
  if (confidence === "inferred") return 3;
  if (confidence === "conflict") return 2;
  return 1;
}

function dedupeById<T extends { id: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

function sortEvidenceByConfidence<T extends { confidence: EvidenceConfidence }>(entries: T[]): T[] {
  return [...entries].sort((left, right) => evidenceConfidenceRank(right.confidence) - evidenceConfidenceRank(left.confidence));
}

function evidenceTokens(entry: EvidenceRef): string[] {
  const text = `${entry.title} ${entry.detail} ${entry.location}`.toLowerCase();
  return [...new Set(text.split(/[^a-z0-9]+/g).filter((token) => token.length >= 3))];
}

function normalized(text: string): string {
  return text.toLowerCase().trim();
}

function evidenceMatchesAttempt(attempt: string, entry: EvidenceRef): boolean {
  const attemptText = normalized(attempt);
  return evidenceTokens(entry).some((token) => attemptText.includes(token));
}

function pickEvidenceMatches(attempt: string, evidence: EvidenceRef[]): EvidenceRef[] {
  return dedupeById(evidence.filter((entry) => evidenceMatchesAttempt(attempt, entry)));
}

function mapReasonToEvidenceHinter(
  reason: string,
  attemptText: string,
  evidence: EvidenceRef[],
): EvidenceRef[] {
  const normalizedReason = normalized(reason);
  const normalizedAttempt = normalized(attemptText);
  const tokens = [
    "caller",
    "consumer",
    "test",
    "null",
    "204",
    "unauthenticated",
    "failure",
  ];
  const selectedByReason = evidence.filter((entry) => {
    const evidenceText = normalized(`${entry.title} ${entry.detail} ${entry.location}`);
    return tokens.some((token) => {
      const matchesReason = normalizedReason.includes(token);
      const matchesAttempt = normalizedAttempt.includes(token);
      const matchesEvidence = evidenceText.includes(token);
      return (matchesReason && matchesEvidence) || (matchesAttempt && matchesEvidence);
    });
  });

  if (selectedByReason.length > 0) {
    return dedupeById(selectedByReason);
  }

  if (evidence.length === 0) {
    return [];
  }

  return dedupeById(sortEvidenceByConfidence(evidence).slice(0, 2));
}

function buildCalibrationGapReport(
  selfConfidence: number,
  evidenceFit: number,
): { calibrationScore: number; selfConfidence01: number } {
  const selfConfidence01 = normalizeConfidence(selfConfidence);
  const calibrationScore = clamp01(1 - Math.abs(selfConfidence01 - evidenceFit));
  return { calibrationScore, selfConfidence01 };
}

function makeAttemptId(boundaryId: string, attemptIndex: number, submittedAt: number): string {
  return `attempt-${boundaryId}-${String(Math.max(1, attemptIndex)).padStart(2, "0")}-${submittedAt}`;
}

function makeGapDiagnostic(
  reason: string,
  attemptText: string,
  evidence: EvidenceRef[],
  fallback: EvidenceRef[],
): OwnershipAttemptGap {
  return {
    reason,
    evidenceRefs: dedupeById(
      mapReasonToEvidenceHinter(reason, attemptText, evidence).concat(
        evidence.length === 0 ? fallback : [],
      ),
    ),
    smallestRepair:
      reason.toLowerCase().includes("overconfident") || reason.toLowerCase().includes("calibration")
        ? "Lower confidence until evidence coverage is explicit, then re-run the attempt."
        : "Add the missing caller/privilege guard sentence and mention the caller failure branch in one phrase.",
  };
}

function isGapState(state: string): boolean {
  return state !== "owned";
}

function makeReadinessGate(state: string, evidenceFit: number, calibrationScore: number): ReadinessGate {
  if (state === "owned" && evidenceFit >= OWNED_EVIDENCE_FIT_GATE && calibrationScore >= OWNED_CALIBRATION_GATE) {
    return "ready";
  }
  return evidenceFit < MIN_EVIDENCE_FIT_TO_START ? "blocked" : "repair-needed";
}

function antiOverconfidenceBlock(
  stateFromAttempt:
    | "owned"
    | "partial"
    | "gap"
    | "attempted"
    | "questionable"
    | "unvisited"
    | "blocked",
  selfConfidence01: number,
  calibrationScore: number,
  evidenceFit: number,
): boolean {
  if (stateFromAttempt !== "owned") {
    return false;
  }

  if (selfConfidence01 >= OWNED_CONFIDENCE_GATE && calibrationScore < OWNED_CALIBRATION_GATE) {
    return true;
  }

  return evidenceFit < OWNED_EVIDENCE_FIT_GATE;
}

export function evaluateOwnershipAttemptReadiness(input: ReadinessInput): OwnershipAttemptReadiness {
  const now = input.now ?? (() => Date.now());
  const attemptText = input.attemptText.trim();
  const submittedAt = input.submittedAt ?? now();
  const startedAt = input.startedAt;
  const evidence = input.boundary.evidence;

  const evaluatedAttempt = evaluateAttempt(attemptText, input.boundary);
  const fallbackEvidenceRefs = fallbackEvidence(input.boundary);
  const evidencePool = evidence.length > 0 ? evidence : fallbackEvidenceRefs;
  const attemptEvidenceRefs = pickEvidenceMatches(attemptText, evidencePool);
  const evidenceFit = evidencePool.length === 0 ? 0 : clamp01(attemptEvidenceRefs.length / evidencePool.length);
  const { calibrationScore, selfConfidence01 } = buildCalibrationGapReport(input.selfConfidence, evidenceFit);
  const antiOverconfidence = antiOverconfidenceBlock(evaluatedAttempt.state, selfConfidence01, calibrationScore, evidenceFit);
  let readinessGate = makeReadinessGate(evaluatedAttempt.state, evidenceFit, calibrationScore);

  let state = evaluatedAttempt.state;
  let gapReason = evaluatedAttempt.gapReason;
  let smallestRepair = evaluatedAttempt.smallestRepair;
  let gapDiagnoses: OwnershipAttemptGap[] = [];

  if (antiOverconfidence) {
    state = "partial";
    gapReason = "Attempt was overly confident relative to visible evidence support.";
    smallestRepair = "Lower confidence estimate and add evidence-backed caller failure detail.";
    readinessGate = "repair-needed";
    gapDiagnoses = [makeGapDiagnostic(gapReason, attemptText, evidencePool, fallbackEvidenceRefs)];
  } else if (readinessGate !== "ready" && state === "owned") {
    gapReason = "Attempt met ownership heuristics but readiness confidence/evidence thresholds are not met.";
    smallestRepair =
      "Lower confidence to match evidence quality and anchor the final attempt to a specific caller failure branch.";
    readinessGate = evidenceFit < OWNED_EVIDENCE_FIT_GATE ? "blocked" : "repair-needed";
    gapDiagnoses = [makeGapDiagnostic(gapReason, attemptText, evidencePool, fallbackEvidenceRefs)];
    state = "partial";
  } else if (isGapState(state)) {
    gapReason = evaluatedAttempt.gapReason;
    smallestRepair = evaluatedAttempt.smallestRepair;
    gapDiagnoses = [
      makeGapDiagnostic(
        gapReason ?? "Missing boundary coverage for this attempt.",
        attemptText,
        evidencePool,
        fallbackEvidenceRefs,
      ),
    ];
  }

  return {
    attempt_id: makeAttemptId(input.boundary.id, input.attemptIndex, submittedAt),
    self_confidence: normalizeConfidence(input.selfConfidence),
    evidence_fit: evidenceFit,
    calibration_score: calibrationScore,
    readiness_gate: readinessGate,
    state,
    summary: evaluatedAttempt.summary,
    gapReason,
    gapDiagnoses,
    smallestRepair,
    returnCondition: evaluatedAttempt.returnCondition,
    attemptEvidenceRefs,
    startedAt,
    submittedAt,
    elapsedMs: Math.max(1, submittedAt - startedAt),
  };
}
