import type {
  CodeEvidence,
  EvidenceRef,
  EvidenceConfidence,
  OwnershipBoundary,
  OwnershipBoundaryRiskProfile,
  RelationEvidenceCandidate,
  ReviewQueueItem,
} from "./types";
import { extractCodeEvidence } from "./evidenceExtraction.ts";

type FileDiffIndex = Record<string, unknown>;
type BoundaryStateKind = "unvisited" | "attempted" | "owned" | "partial" | "gap" | "blocked" | "questionable";

export type BoundariesInput = {
  baseBoundary: OwnershipBoundary;
  fileFixtures: Record<string, string>;
  evidenceRefs: EvidenceRef[];
  reviewQueue: ReviewQueueItem[];
  fileDiffsByPath: FileDiffIndex;
};

type ProjectionInput = {
  boundary: OwnershipBoundary;
  baseFileStates: Record<string, BoundaryStateKind>;
  fileDiffsByPath: FileDiffIndex;
  reviewQueue: ReviewQueueItem[];
};

type BoundaryProjection = {
  fileStates: Record<string, BoundaryStateKind>;
  fileStateReasons: Record<string, string>;
};

const relationKindRiskWeight: Record<RelationEvidenceCandidate["kind"], number> = {
  "runtime-contract": 2,
  caller: 6,
  test: 4,
  doc: 3,
};

const evidenceRiskWeight: Record<EvidenceConfidence, number> = {
  observed: 0,
  inferred: 3,
  unverified: 7,
  conflict: 9,
};

const relationMissingPenalty: Record<
  "missing caller" | "missing test path" | "missing runtime contract",
  number
> = {
  "missing caller": 24,
  "missing test path": 12,
  "missing runtime contract": 8,
};

const baseRiskFloor = 14;
const unknownEvidencePenalty = 11;
const missingDeletionPenalty = 15;
const stateQuestionablePenalty = 4;

function clampScore(score: number): number {
  return Math.min(100, Math.max(0, score));
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function getLocationPath(location: string): string {
  const split = location.indexOf(":");
  return split === -1 ? location : location.slice(0, split);
}

function evidenceConfidenceRank(confidence: EvidenceConfidence): number {
  if (confidence === "observed") return 4;
  if (confidence === "inferred") return 3;
  if (confidence === "conflict") return 2;
  return 1;
}

function maxEvidenceConfidence(entries: EvidenceRef[]): EvidenceConfidence {
  if (entries.length === 0) {
    return "unverified";
  }

  return entries.reduce((best, entry) => {
    return evidenceConfidenceRank(entry.confidence) > evidenceConfidenceRank(best) ? entry.confidence : best;
  }, "unverified" as EvidenceConfidence);
}

function extractEvidenceForFiles(evidenceRefs: EvidenceRef[], filePaths: string[]): EvidenceRef[] {
  const target = new Set(filePaths);
  return unique(evidenceRefs.filter((entry) => target.has(getLocationPath(entry.location))));
}

function collectRelationEvidenceByFile(
  fileFixtures: Record<string, string>,
  evidenceRefs: EvidenceRef[],
  reviewQueue: ReviewQueueItem[],
  filePaths: string[],
): Record<string, CodeEvidence> {
  const evidenceByFile: Record<string, CodeEvidence> = {};
  for (const selectedFile of filePaths) {
    evidenceByFile[selectedFile] = extractCodeEvidence({
      selectedFile,
      fileFixtures,
      evidenceRefs,
      reviewQueue,
    });
  }
  return evidenceByFile;
}

function makeResponsibilityClaim(baseBoundary: OwnershipBoundary): string {
  return (
    baseBoundary.whyMatters ??
    "This boundary is relation-scoped and requires caller/test coverage before it can be claimed as owned."
  );
}

function makeOpenQuestions(evidenceByFile: Record<string, CodeEvidence>): string[] {
  const questions = new Set<string>();
  for (const fileEvidence of Object.values(evidenceByFile)) {
    for (const gap of fileEvidence.relationGaps) {
      questions.add(`Resolve "${gap.type}" for ${fileEvidence.selectedFile}: ${gap.candidateReason}`);
    }
  }

  if (questions.size === 0) {
    questions.add("Validate observed evidence against caller/test prerequisites with concrete evidence refs.");
  }

  return [...questions];
}

function riskScoreFromEvidence(
  boundaryFilePaths: string[],
  evidenceByFile: Record<string, CodeEvidence>,
  fileDiffsByPath: FileDiffIndex,
): OwnershipBoundaryRiskProfile {
  let relationWeight = 0;
  let missingCallerPenalty = 0;
  let missingDeletionPenaltyTotal = 0;
  let blockedPenalty = 0;
  let questionablePenalty = 0;

  const diffPaths = new Set(Object.keys(fileDiffsByPath));

  for (const filePath of boundaryFilePaths) {
    const evidence = evidenceByFile[filePath];
    if (!evidence) {
      relationWeight += unknownEvidencePenalty;
      questionablePenalty += 1;
      continue;
    }

    if (!diffPaths.has(filePath) && filePath !== boundaryFilePaths[0]) {
      missingDeletionPenaltyTotal += missingDeletionPenalty;
    }

    if (evidence.relationCandidates.length === 0) {
      questionablePenalty += 3;
    }

    for (const candidate of evidence.relationCandidates) {
      relationWeight += relationKindRiskWeight[candidate.kind] + evidenceRiskWeight[candidate.evidenceKind];
    }

    for (const gap of evidence.relationGaps) {
      missingCallerPenalty += gap.type === "missing caller" ? relationMissingPenalty["missing caller"] : 0;
      missingDeletionPenaltyTotal +=
        gap.type === "missing test path" ? relationMissingPenalty["missing test path"] : 0;
      missingDeletionPenaltyTotal +=
        gap.type === "missing runtime contract" ? relationMissingPenalty["missing runtime contract"] : 0;
    }

    if (evidence.relationGaps.length > 0) {
      questionablePenalty += stateQuestionablePenalty;
    }
    if (evidence.evidenceKindCounts?.unverified) {
      blockedPenalty += evidence.evidenceKindCounts.unverified;
    }
  }

  const score = clampScore(
    baseRiskFloor +
      relationWeight +
      missingCallerPenalty +
      missingDeletionPenaltyTotal +
      blockedPenalty +
      questionablePenalty,
  );

  return {
    score,
    relationWeight,
    missingCallerPenalty,
    missingDeletionPenalty: missingDeletionPenaltyTotal,
    blockedPenalty,
    questionablePenalty,
  };
}

function evidenceReasonForFile(boundary: OwnershipBoundary, filePath: string): string | null {
  const hasPathEvidence = boundary.evidence.some((entry) => getLocationPath(entry.location) === filePath);
  if (hasPathEvidence) return null;
  return "questionable: no evidence-backed reasoned claim for this file in this boundary.";
}

const reasonedPrefixPatterns = [
  "gap: missing caller",
  "gap: missing deletion path",
  "blocked: prerequisite",
  "questionable",
] as const;

type StructuredReasonPrefix = (typeof reasonedPrefixPatterns)[number];

function getStructuredReasonPrefix(reason: string): StructuredReasonPrefix | null {
  for (const prefix of reasonedPrefixPatterns) {
    if (reason.startsWith(prefix)) {
      return prefix;
    }
  }

  return null;
}

function stripPrefix(reason: string, prefix: string): string {
  const remainder = reason.slice(prefix.length).trim();
  return remainder.replace(/^[-:]\s*/, "");
}

function mergeStructuredReasonWithHint(reason: string, hint: string): string {
  const structuredReason = getStructuredReasonPrefix(reason);
  if (!structuredReason) {
    const structuredHint = getStructuredReasonPrefix(hint);
    if (structuredHint != null) {
      return hint;
    }
    return hint.startsWith("questionable") ? hint : `questionable: ${hint}`;
  }

  const hintPrefix = getStructuredReasonPrefix(hint);
  const hintRemainder = hintPrefix == null ? hint : stripPrefix(hint, hintPrefix);
  if (hintRemainder.length === 0) {
    return reason;
  }

  return `${reason} - ${hintRemainder}`;
}

export function buildBoundaryCandidates({
  baseBoundary,
  fileFixtures,
  evidenceRefs,
  reviewQueue,
  fileDiffsByPath,
}: BoundariesInput): OwnershipBoundary[] {
  const reviewedPaths = reviewQueue
    .map((item) => item.filePath)
    .filter((path) => Object.prototype.hasOwnProperty.call(fileFixtures, path));
  const files = unique([baseBoundary.filePath, ...reviewedPaths]);
  const evidenceByFile = collectRelationEvidenceByFile(fileFixtures, evidenceRefs, reviewQueue, files);
  const evidence = extractEvidenceForFiles(evidenceRefs, files);

  const candidateBoundary: OwnershipBoundary = {
    ...baseBoundary,
    files,
    responsibility_claim: makeResponsibilityClaim(baseBoundary),
    evidence,
    open_questions: makeOpenQuestions(evidenceByFile),
    risk: riskScoreFromEvidence(files, evidenceByFile, fileDiffsByPath),
    confidence: maxEvidenceConfidence(evidence),
  };

  if (files.length >= Object.keys(fileFixtures).length) {
    candidateBoundary.confidence = "unverified";
    candidateBoundary.risk.blockedPenalty += 12;
    candidateBoundary.risk.score = clampScore(candidateBoundary.risk.score + 12);
    candidateBoundary.state_reason_hints = {
      ...candidateBoundary.state_reason_hints,
      [baseBoundary.filePath]:
        "questionable: scope is fixture-local; do not treat as whole-repo ownership without cross-surface evidence.",
    };
  }

  if (!Object.prototype.hasOwnProperty.call(fileDiffsByPath, baseBoundary.filePath)) {
    candidateBoundary.risk.missingDeletionPenalty += 24;
    candidateBoundary.risk.score = clampScore(candidateBoundary.risk.score + 24);
    candidateBoundary.state_reason_hints = {
      ...candidateBoundary.state_reason_hints,
      [baseBoundary.filePath]: "gap: missing deletion path",
    };
  }

  for (const filePath of files) {
    const noEvidenceReason = evidenceReasonForFile(candidateBoundary, filePath);
    if (noEvidenceReason != null && !candidateBoundary.state_reason_hints?.[filePath]) {
      candidateBoundary.state_reason_hints = {
        ...candidateBoundary.state_reason_hints,
        [filePath]: noEvidenceReason,
      };
    }
  }

  return [candidateBoundary];
}

export function selectHighestRiskBoundary(candidates: OwnershipBoundary[]): OwnershipBoundary {
  if (candidates.length === 0) {
    throw new Error("Cannot select boundary from empty candidate list.");
  }

  return [...candidates].sort((left, right) => {
    if (right.risk.score !== left.risk.score) {
      return right.risk.score - left.risk.score;
    }
    if (right.risk.relationWeight !== left.risk.relationWeight) {
      return right.risk.relationWeight - left.risk.relationWeight;
    }
    return left.id.localeCompare(right.id);
  })[0]!;
}

export function projectBoundaryFileStates({
  boundary,
  baseFileStates,
  fileDiffsByPath,
  reviewQueue,
}: ProjectionInput): BoundaryProjection {
  const fileStates: Record<string, BoundaryStateKind> = { ...baseFileStates };
  const fileStateReasons: Record<string, string> = {};
  const diffPaths = new Set(Object.keys(fileDiffsByPath));
  const queueByFile = new Map(reviewQueue.map((item) => [item.filePath, item.touched]));

  for (const filePath of boundary.files) {
    const observedState = fileStates[filePath] ?? "unvisited";
    const inDiff = diffPaths.has(filePath);
    const queueTouched = queueByFile.get(filePath) ?? false;
    const hasEvidence = boundary.evidence.some((entry) => getLocationPath(entry.location) === filePath);

    let nextState: BoundaryStateKind = observedState;
    let nextReason = "";

    if (observedState === "owned") {
      nextState = "owned";
    } else if (!inDiff && filePath !== boundary.filePath) {
      nextState = "gap";
      nextReason = "gap: missing deletion path";
    } else if (filePath === boundary.filePath && (observedState === "unvisited" || observedState === "gap")) {
      nextState = "gap";
      nextReason = "gap: missing caller";
    } else if (filePath !== boundary.filePath && observedState === "attempted" && !queueTouched) {
      nextState = "blocked";
      nextReason = "blocked: prerequisite";
    } else if (observedState === "attempted" || observedState === "partial") {
      nextState = "questionable";
      nextReason = "questionable";
    } else if (observedState === "questionable") {
      nextState = "questionable";
      nextReason = "questionable";
    } else if (observedState === "gap") {
      nextState = "gap";
      nextReason = hasEvidence ? "gap: missing caller" : "gap: missing caller";
    } else if (observedState === "unvisited") {
      nextState = "gap";
      nextReason = "gap: missing caller";
    }

    fileStates[filePath] = nextState;
    if (nextState !== "owned") {
      fileStateReasons[filePath] = nextReason.length > 0 ? nextReason : "questionable";
    }
  }

  if (boundary.state_reason_hints != null) {
    for (const [filePath, reason] of Object.entries(boundary.state_reason_hints)) {
      if (fileStates[filePath] != null && fileStates[filePath] !== "owned") {
        fileStateReasons[filePath] = mergeStructuredReasonWithHint(fileStateReasons[filePath] ?? "", reason);
      }
    }
  }

  return { fileStates, fileStateReasons };
}
