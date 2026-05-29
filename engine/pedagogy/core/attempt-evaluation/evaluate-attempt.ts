import type {
  EvidenceCheck,
  EvidenceCheckResult,
  EvidenceInventoryEntry,
  EvidenceRef,
} from "../loop-types.ts";
import { classifyGapTaxonomy } from "./gap-taxonomy.ts";
import { localRandomIdSegment } from "./id.ts";
import { extractArtifactTerminology, extractKeywords, isTechnicalTerm, scoreKeywordMatch } from "./text-helpers.ts";
import type { EvaluateAttemptInput, EvaluateAttemptOutput } from "./types.ts";

const UNCERTAIN_ANSWER_PATTERNS = [
  /^i (do not|don't) know[.!]?$/i,
  /^(unsure|not sure|no idea)[.!]?$/i,
];

export function evaluateAttempt(input: EvaluateAttemptInput): EvaluateAttemptOutput {
  const { attempt, operation, artifact, evidenceInventory } = input;

  if (attempt.operation_id !== operation.id) {
    throw new Error(
      `Attempt operation_id '${attempt.operation_id}' does not match operation id '${operation.id}'`,
    );
  }

  const answerLower = attempt.answer_text.toLowerCase().trim();
  const isUncertain = answerLower.length === 0
    || UNCERTAIN_ANSWER_PATTERNS.some((pattern) => pattern.test(answerLower));

  const criteria = normalizeCriteria(operation.success_criteria, artifact.success_criteria);
  const hasDefinedCriteria = criteria.length > 0;

  const evidenceById = buildEvidenceById(artifact.source_evidence, evidenceInventory);
  const { citedEvidence, outOfBoundEvidenceIds } = collectCitedEvidence(attempt.selected_evidence, evidenceById);

  const observedClaims: string[] = [];
  const missingClaims: string[] = [];
  const unsupportedClaims: string[] = [];
  const contradictedClaims: string[] = [];

  if (!hasDefinedCriteria) {
    unsupportedClaims.push("No success criteria defined for operation or artifact");
  }

  const hasCitations = citedEvidence.length > 0;
  const observeThreshold = hasCitations ? 0.25 : 0.4;
  const partialThreshold = hasCitations ? 0.1 : 0.2;

  for (const criterion of criteria) {
    const criterionKeywords = extractKeywords(criterion);
    const matchScore = scoreKeywordMatch(answerLower, criterionKeywords);

    if (matchScore >= observeThreshold && hasCitations) {
      observedClaims.push(criterion);
    } else if (matchScore >= observeThreshold && !hasCitations) {
      unsupportedClaims.push(`Lacks cited evidence: ${criterion}`);
    } else if (matchScore >= partialThreshold) {
      unsupportedClaims.push(`Partially addressed: ${criterion}`);
    } else {
      missingClaims.push(criterion);
    }
  }

  detectContradictions(answerLower, artifact.hidden_solution_evidence, contradictedClaims);
  const hasOverScopeFindings = detectOverScopeFindings(answerLower, artifact, operation, observedClaims, unsupportedClaims);

  const hasDeclaredUncertainty = isUncertain || attempt.declared_unknowns.length > 0;
  if (isUncertain && observedClaims.length === 0) {
    for (const criterion of criteria) {
      if (!missingClaims.includes(criterion)) {
        missingClaims.push(criterion);
      }
    }
  }

  const allDeclaredUnknown = attempt.declared_unknowns.length > 0
    && answerLower.length < 20
    && observedClaims.length === 0;
  const hasBlockingUnsupportedFindings = unsupportedClaims.length > 0
    || outOfBoundEvidenceIds.length > 0
    || hasOverScopeFindings;

  let result: EvidenceCheckResult;
  if (contradictedClaims.length > 0) {
    result = "contradiction";
  } else if (!hasDefinedCriteria) {
    result = "insufficient_evidence";
  } else if (allDeclaredUnknown) {
    result = "insufficient_evidence";
  } else if (observedClaims.length === criteria.length && criteria.length > 0 && !hasBlockingUnsupportedFindings) {
    result = "confirmed";
  } else if (observedClaims.length === criteria.length && hasBlockingUnsupportedFindings) {
    result = "insufficient_evidence";
  } else if (observedClaims.length > 0 && missingClaims.length <= criteria.length * 0.5) {
    result = "partial";
  } else {
    result = "gap";
  }

  const finalUnsupportedClaims = [
    ...unsupportedClaims,
    ...(outOfBoundEvidenceIds.length > 0
      ? [`Out-of-bound evidence cited: ${outOfBoundEvidenceIds.join(", ")}`]
      : []),
  ];

  const evidenceCheck: EvidenceCheck = {
    id: `EC-${localRandomIdSegment()}`,
    attempt_id: attempt.id,
    required_claims: criteria,
    observed_claims: observedClaims,
    missing_claims: missingClaims,
    contradicted_claims: contradictedClaims,
    unsupported_claims: finalUnsupportedClaims,
    cited_evidence: citedEvidence,
    artifact_counterevidence: artifact.hidden_solution_evidence,
    result,
  };

  const gapKind = classifyGapTaxonomy(attempt, evidenceCheck, operation, artifact);
  const isOverconfident = attempt.declared_confidence === "high"
    && (contradictedClaims.length > 0
      || result === "gap"
      || result === "contradiction"
      || result === "insufficient_evidence");

  return {
    evidenceCheck,
    gapKind,
    isOverconfident,
    hasDeclaredUncertainty,
  };
}

function normalizeCriteria(
  operationCriteria: string[],
  artifactCriteria: string[],
): string[] {
  const normalizedOperation = operationCriteria.map((criterion) => criterion.trim()).filter(Boolean);
  const normalizedArtifact = artifactCriteria.map((criterion) => criterion.trim()).filter(Boolean);
  return normalizedOperation.length > 0 ? normalizedOperation : normalizedArtifact;
}

function buildEvidenceById(
  sourceEvidence: EvidenceRef[],
  evidenceInventory?: EvidenceInventoryEntry[],
): Map<string, EvidenceRef> {
  const byId = new Map<string, EvidenceRef>();

  for (const reference of sourceEvidence) {
    byId.set(reference.evidence_id, reference);
  }

  for (const entry of evidenceInventory ?? []) {
    if (!byId.has(entry.id)) {
      byId.set(entry.id, {
        evidence_id: entry.id,
        file_path: entry.path,
        start_line: 0,
        end_line: 0,
        excerpt: entry.excerpt,
        role: entry.role,
      });
    }
  }

  return byId;
}

function collectCitedEvidence(
  selectedEvidenceIds: string[],
  evidenceById: Map<string, EvidenceRef>,
): { citedEvidence: EvidenceRef[]; outOfBoundEvidenceIds: string[] } {
  const citedEvidence: EvidenceRef[] = [];
  const outOfBoundEvidenceIds: string[] = [];

  for (const evidenceId of selectedEvidenceIds) {
    const reference = evidenceById.get(evidenceId);
    if (reference) {
      citedEvidence.push(reference);
    } else {
      outOfBoundEvidenceIds.push(evidenceId);
    }
  }

  return { citedEvidence, outOfBoundEvidenceIds };
}

function detectContradictions(
  answerLower: string,
  hiddenSolutionEvidence: EvidenceRef[],
  contradictedClaims: string[],
): void {
  for (const counterRef of hiddenSolutionEvidence) {
    const counterKeywords = extractKeywords(counterRef.excerpt);
    const matchedKeywords = counterKeywords.filter((keyword) => answerLower.includes(keyword));
    if (matchedKeywords.length >= 3
      && /\b(not|no|never|doesn't|isn't|won't|can't|cannot|incorrect)\b/i.test(answerLower)) {
      contradictedClaims.push(
        `Answer contradicts counterevidence at ${counterRef.file_path}:${counterRef.start_line}-${counterRef.end_line}: ${counterRef.excerpt.substring(0, 80)}`,
      );
    }
  }

  const negatedTermPattern = /\bnot\s+(\w+)\b/gi;
  let negMatch: RegExpExecArray | null;
  while ((negMatch = negatedTermPattern.exec(answerLower)) !== null) {
    const negatedTerm = negMatch[1];
    if (negatedTerm.length < 3) continue;
    for (const counterRef of hiddenSolutionEvidence) {
      if (counterRef.excerpt.toLowerCase().includes(negatedTerm)) {
        contradictedClaims.push(
          `Answer negates '${negatedTerm}' but evidence at ${counterRef.file_path}:${counterRef.start_line} asserts it`,
        );
      }
    }
  }

  const notPattern = /\b(\w+),\s*not\s+(\w+)/gi;
  let patternMatch: RegExpExecArray | null;
  while ((patternMatch = notPattern.exec(answerLower)) !== null) {
    const contradictedTerm = patternMatch[2];
    if (contradictedTerm.length < 3) continue;
    for (const counterRef of hiddenSolutionEvidence) {
      if (counterRef.excerpt.toLowerCase().includes(contradictedTerm)) {
        contradictedClaims.push(
          `Answer claims '${patternMatch[1]}, not ${contradictedTerm}' but evidence at ${counterRef.file_path}:${counterRef.start_line} includes '${contradictedTerm}'`,
        );
      }
    }
  }

  const deduped = [...new Set(contradictedClaims)];
  contradictedClaims.length = 0;
  contradictedClaims.push(...deduped);
}

function detectOverScopeFindings(
  answerLower: string,
  artifact: EvaluateAttemptInput["artifact"],
  operation: EvaluateAttemptInput["operation"],
  observedClaims: string[],
  unsupportedClaims: string[],
): boolean {
  const artifactTerms = extractArtifactTerminology(artifact, operation);
  const answerTerms = new Set(
    answerLower
      .split(/[^a-z0-9_-]+/)
      .filter((token) => token.length > 3),
  );
  const overScopeTerms = [...answerTerms].filter(
    (term) => !artifactTerms.has(term) && isTechnicalTerm(term),
  );

  if (overScopeTerms.length >= 5 && answerLower.length < 300 && observedClaims.length < 3) {
    unsupportedClaims.push(
      `Answer references concepts outside the artifact scope: ${overScopeTerms.slice(0, 5).join(", ")}`,
    );
    return true;
  }

  return false;
}
