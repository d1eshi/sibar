import { randomUUID } from "node:crypto";

import type {
  UserAttempt,
  UserOperation,
  ThinkingArtifact,
  EvidenceCheck,
  EvidenceCheckResult,
  EvidenceRef,
  OwnershipGapKind,
  EvidenceInventoryEntry,
} from "./runtime-deep-ownership.ts";

// ── Attempt Capture ──────────────────────────────────────────────────

export type CreateAttemptInput = {
  operation_id: string;
  answer_text: string;
  selected_evidence: string[];
  declared_confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
};

export function createAttempt(input: CreateAttemptInput): UserAttempt {
  if (!input.operation_id || typeof input.operation_id !== "string") {
    throw new Error("operation_id is required");
  }
  if (typeof input.answer_text !== "string") {
    throw new Error("answer_text must be a string");
  }
  if (!["low", "medium", "high"].includes(input.declared_confidence)) {
    throw new Error(`Invalid declared_confidence: ${input.declared_confidence}`);
  }

  return {
    id: `ATT-${randomUUID().slice(0, 8)}`,
    operation_id: input.operation_id,
    answer_text: input.answer_text,
    selected_evidence: Array.isArray(input.selected_evidence) ? input.selected_evidence : [],
    declared_confidence: input.declared_confidence,
    declared_unknowns: Array.isArray(input.declared_unknowns) ? input.declared_unknowns : [],
    created_at: new Date().toISOString(),
  };
}

// ── Attempt Evaluation ───────────────────────────────────────────────

export type EvaluateAttemptInput = {
  attempt: UserAttempt;
  operation: UserOperation;
  artifact: ThinkingArtifact;
  evidenceInventory?: EvidenceInventoryEntry[];
};

export type EvaluateAttemptOutput = {
  evidenceCheck: EvidenceCheck;
  gapKind: OwnershipGapKind | null;
  isOverconfident: boolean;
  hasDeclaredUncertainty: boolean;
};

/**
 * Evaluate a user attempt against the artifact's operation and success criteria.
 * Produces an EvidenceCheck that distinguishes confirmed, missing, contradicted,
 * and unsupported claims. Also detects declaration of uncertainty, false
 * confidence, and classifies the gap taxonomy kind.
 */
export function evaluateAttempt(input: EvaluateAttemptInput): EvaluateAttemptOutput {
  const { attempt, operation, artifact, evidenceInventory } = input;

  // Validate the attempt belongs to the operation
  if (attempt.operation_id !== operation.id) {
    throw new Error(
      `Attempt operation_id '${attempt.operation_id}' does not match operation id '${operation.id}'`,
    );
  }

  const answerLower = attempt.answer_text.toLowerCase().trim();
  const isUncertain = answerLower.length === 0
    || /^i (do not|don't) know[.!]?$/i.test(answerLower)
    || /^(unsure|not sure|no idea)[.!]?$/i.test(answerLower);

  // Collect valid evidence IDs from the artifact and inventory
  const validEvidenceIds = new Set<string>();
  for (const ref of artifact.source_evidence) {
    validEvidenceIds.add(ref.evidence_id);
  }
  if (evidenceInventory) {
    for (const entry of evidenceInventory) {
      validEvidenceIds.add(entry.id);
    }
  }

  // Check cited evidence validity
  const inBoundCitedEvidence: EvidenceRef[] = [];
  const outOfBoundEvidenceIds: string[] = [];
  for (const evId of attempt.selected_evidence) {
    if (validEvidenceIds.has(evId)) {
      const ref = artifact.source_evidence.find((r) => r.evidence_id === evId)
        ?? (evidenceInventory
          ?.find((e) => e.id === evId)
          ? ((): EvidenceRef => ({
              evidence_id: evId,
              file_path: evidenceInventory?.find((e) => e.id === evId)?.path ?? "",
              start_line: 0,
              end_line: 0,
              excerpt: evidenceInventory?.find((e) => e.id === evId)?.excerpt ?? "",
              role: evidenceInventory?.find((e) => e.id === evId)?.role ?? "unknown",
            }))()
          : null);
      if (ref) {
        inBoundCitedEvidence.push(ref);
      } else {
        outOfBoundEvidenceIds.push(evId);
      }
    } else {
      outOfBoundEvidenceIds.push(evId);
    }
  }

  // Evaluate each success criterion
  const observedClaims: string[] = [];
  const missingClaims: string[] = [];
  const unsupportedClaims: string[] = [];
  const contradictedClaims: string[] = [];

  const criteria = operation.success_criteria.length > 0
    ? operation.success_criteria
    : artifact.success_criteria;

  const hasCitations = inBoundCitedEvidence.length > 0;
  // For answers with citations, lower the threshold since evidence is provided
  const observeThreshold = hasCitations ? 0.25 : 0.4;
  const partialThreshold = hasCitations ? 0.10 : 0.2;

  for (const criterion of criteria) {
    const criterionKeywords = extractKeywords(criterion);
    const matchScore = scoreKeywordMatch(answerLower, criterionKeywords);

    if (matchScore >= observeThreshold && hasCitations) {
      observedClaims.push(criterion);
    } else if (matchScore >= observeThreshold && !hasCitations) {
      // Addressed but no evidence cited
      unsupportedClaims.push(`Lacks cited evidence: ${criterion}`);
    } else if (matchScore >= partialThreshold) {
      unsupportedClaims.push(`Partially addressed: ${criterion}`);
    } else {
      missingClaims.push(criterion);
    }
  }

  // Contradiction detection: check if answer makes claims that DIRECTLY CONTRADICT
  // the hidden solution evidence. Look for negation patterns around key terms.
  for (const counterRef of artifact.hidden_solution_evidence) {
    const counterKeywords = extractKeywords(counterRef.excerpt);
    // Only check significant keywords (length > 3) that appear in the answer
    const matchedKeywords = counterKeywords.filter((kw) => answerLower.includes(kw));

    if (matchedKeywords.length >= 3) {
      // Check if the answer uses negation near these keywords
      const hasNegation = /\b(not|no|never|doesn't|isn't|won't|can't|cannot|incorrect)\b/i.test(answerLower);
      if (hasNegation) {
        contradictedClaims.push(
          `Answer contradicts counterevidence at ${counterRef.file_path}:${counterRef.start_line}-${counterRef.end_line}: ${counterRef.excerpt.substring(0, 80)}`,
        );
      }
    }
  }

  // Also check for direct factual contradictions: if answer explicitly says
  // something IS X when counterevidence says it IS Y
  const negatedTermPattern = /\bnot\s+(\w+)\b/gi;
  let negMatch;
  while ((negMatch = negatedTermPattern.exec(answerLower)) !== null) {
    const negatedTerm = negMatch[1];
    if (negatedTerm.length < 3) continue;
    // Check if counterevidence uses this term in a positive assertion
    for (const counterRef of artifact.hidden_solution_evidence) {
      if (counterRef.excerpt.toLowerCase().includes(negatedTerm)) {
        contradictedClaims.push(
          `Answer negates '${negatedTerm}' but evidence at ${counterRef.file_path}:${counterRef.start_line} asserts it`,
        );
      }
    }
  }

  // Also detect "X, not Y" patterns where Y is in the counterevidence
  const notPattern = /\b(\w+),\s*not\s+(\w+)/gi;
  let npMatch;
  while ((npMatch = notPattern.exec(answerLower)) !== null) {
    const contradicted = npMatch[2];
    if (contradicted.length < 3) continue;
    for (const counterRef of artifact.hidden_solution_evidence) {
      const excerptLower = counterRef.excerpt.toLowerCase();
      if (excerptLower.includes(contradicted)) {
        contradictedClaims.push(
          `Answer claims '${npMatch[1]}, not ${contradicted}' but evidence at ${counterRef.file_path}:${counterRef.start_line} includes '${contradicted}'`,
        );
      }
    }
  }

  // De-duplicate contradicted claims
  const deduped = [...new Set(contradictedClaims)];
  contradictedClaims.length = 0;
  contradictedClaims.push(...deduped);

  // Check for over-scope claims: using terminology/claims not in the concept slice
  const artifactTerms = extractArtifactTerminology(artifact, operation);
  const answerTerms = new Set(
    answerLower
      .split(/[^a-z0-9_-]+/)
      .filter((t) => t.length > 3),
  );
  const overScopeTerms = [...answerTerms].filter(
    (t) => !artifactTerms.has(t) && isTechnicalTerm(t),
  );
  // Over-scope: skip if answer is thorough (long, cited, with observed claims)
  // This prevents flagging legitimate technical answers that go deep into the topic
  if (overScopeTerms.length >= 5 && answerLower.length < 300 && observedClaims.length < 3) {
    unsupportedClaims.push(
      `Answer references concepts potentially outside the artifact scope: ${overScopeTerms.slice(0, 5).join(", ")}`,
    );
  }

  // Detect declared uncertainty
  const hasDeclaredUncertainty = isUncertain || attempt.declared_unknowns.length > 0;

  // Handle declared uncertainty
  if (isUncertain && observedClaims.length === 0) {
    // "I don't know" — all criteria are missing, but no misconception invented
    for (const criterion of criteria) {
      if (!observedClaims.includes(criterion) && !missingClaims.includes(criterion)) {
        missingClaims.push(criterion);
      }
    }
  }

  // If all unknowns, mark as insufficient_evidence
  const allDeclaredUnknown = attempt.declared_unknowns.length > 0
    && answerLower.trim().length < 20
    && observedClaims.length === 0;

  // Determine the evidence check result
  let result: EvidenceCheckResult;

  if (contradictedClaims.length > 0) {
    result = "contradiction";
  } else if (observedClaims.length === criteria.length) {
    result = "confirmed";
  } else if (allDeclaredUnknown) {
    result = "insufficient_evidence";
  } else if (observedClaims.length > 0 && missingClaims.length <= criteria.length * 0.5) {
    result = "partial";
  } else if (observedClaims.length === 0 || missingClaims.length > criteria.length * 0.5) {
    result = "gap";
  } else {
    result = "partial";
  }

  // Detect overconfidence: high confidence but has contradicted claims
  // or result indicates a serious gap (not just partial depth).
  // Unsupported claims alone (e.g., insufficient evidence citation) are NOT
  // overconfidence — they indicate a need for deeper evidence, not wrongness.
  const isOverconfident = attempt.declared_confidence === "high"
    && (contradictedClaims.length > 0
      || result === "gap"
      || result === "contradiction");

  // Build the EvidenceCheck
  const evidenceCheck: EvidenceCheck = {
    id: `EC-${randomUUID().slice(0, 8)}`,
    attempt_id: attempt.id,
    required_claims: criteria,
    observed_claims: observedClaims,
    missing_claims: missingClaims,
    contradicted_claims: contradictedClaims,
    unsupported_claims: [
      ...unsupportedClaims,
      ...(outOfBoundEvidenceIds.length > 0
        ? [`Out-of-bound evidence cited: ${outOfBoundEvidenceIds.join(", ")}`]
        : []),
    ],
    cited_evidence: inBoundCitedEvidence,
    artifact_counterevidence: artifact.hidden_solution_evidence,
    result,
  };

  // Classify gap taxonomy
  const gapKind = classifyGapTaxonomy(attempt, evidenceCheck, operation, artifact);

  return {
    evidenceCheck,
    gapKind,
    isOverconfident,
    hasDeclaredUncertainty,
  };
}

// ── Gap Taxonomy Classification ──────────────────────────────────────

/**
 * Classify the specific gap kind based on the attempt pattern,
 * evidence check results, and artifact context.
 *
 * The gap taxonomy covers:
 * - vocabulary_only: uses correct terminology but no mechanism
 * - memorized_without_mechanism: recites facts, can't explain how/why
 * - test_oracle_misread: misinterpreted test behavior
 * - wrong_mechanism: correct conclusion, wrong reasoning
 * - ignored_counterevidence: ignored contradictory evidence
 * - passive_agreement: agrees without constructing
 * - false_confidence: high confidence with unsupported/contradicted claims
 */
export function classifyGapTaxonomy(
  attempt: UserAttempt,
  evidenceCheck: EvidenceCheck,
  _operation?: UserOperation,
  artifact?: ThinkingArtifact,
): OwnershipGapKind | null {
  if (evidenceCheck.result === "confirmed") {
    return null; // No gap for confirmed attempts
  }

  const answer = attempt.answer_text.trim();
  const answerLower = answer.toLowerCase();

  // IS THE ANSWER EMPTY OR PURELY UNCERTAIN?
  if (answer.length === 0 || /^i (do not|don't) know[.!]?$/i.test(answerLower)
    || /^(unsure|not sure|no idea)[.!]?$/i.test(answerLower)) {
    // Declared uncertainty → shallow_trace (not a misconception)
    return "shallow_trace";
  }

  // IGNORED COUNTEREVIDENCE: attempt contradicts artifact counterevidence
  // (check BEFORE false_confidence since it's more specific — tells you
  // exactly what evidence was ignored, not just that they were overconfident)
  if (evidenceCheck.contradicted_claims.length > 0) {
    return "ignored_counterevidence";
  }

  // FALSE CONFIDENCE: high confidence but result indicates a serious gap.
  // (contradicted claims already handled above as ignored_counterevidence)
  if (attempt.declared_confidence === "high") {
    if (evidenceCheck.result === "gap"
      || evidenceCheck.result === "insufficient_evidence") {
      return "false_confidence";
    }
  }

  // TEST ORACLE MISREAD: references tests but draws wrong conclusions
  // (check before vocabulary/memorized since it's more specific)
  if (isTestOracleMisread(answer, artifact)) {
    return "test_oracle_misread";
  }

  // WRONG MECHANISM: uses causal/reasoning language but contradicts evidence
  // (check before vocabulary/memorized since causal language indicates
  // attempted reasoning, even if incorrect)
  const substantiveMechCount = MECHANISM_PATTERNS.filter((p) => p.test(answerLower)).length;
  if (isWrongMechanism(answer, evidenceCheck) && substantiveMechCount >= 2) {
    return "wrong_mechanism";
  }

  // VOCABULARY-ONLY: right words, no mechanism
  if (isVocabularyOnly(answer, artifact)) {
    return "vocabulary_only";
  }

  // MEMORIZED WITHOUT MECHANISM: can recite, can't explain
  if (isMemorizedWithoutMechanism(answer, evidenceCheck)) {
    return "memorized_without_mechanism";
  }

  // WRONG MECHANISM (FALLBACK): even with fewer mechanism patterns,
  // if there's causal language with unsupported claims
  if (isWrongMechanism(answer, evidenceCheck)) {
    return "wrong_mechanism";
  }

  // PASSIVE AGREEMENT: agrees without constructing
  if (isPassiveAgreement(answer)) {
    return "passive_agreement";
  }

  // FALLBACK: use evidenceCheck to determine gap kind
  if (evidenceCheck.unsupported_claims.length > 0) {
    return "unsupported_claim";
  }

  if (evidenceCheck.missing_claims.length > 0) {
    return "missing_prerequisite";
  }

  return "shallow_trace";
}

// ── Gap Detection Helpers ────────────────────────────────────────────

const DOMAIN_TERMS_PATTERN = /\b(module|function|class|interface|type|pattern|flow|state|data|config|boundary|scope|evidence|gap|readiness|repair|memory|slice|artifact|operation|concept|pedagogy|claim|check|taxonomy|severity|confidence|quality|detection|branch|field|map|trace|runtime|answer)\b/i;

const MECHANISM_PATTERNS = [
  /\bbecause\b/i,
  /\btherefore\b/i,
  /\bwhen\b.*\bthen\b/i,
  /\bleads to\b/i,
  /\bcauses?\b/i,
  /\bresults? in\b/i,
  /\bdepends? on\b/i,
  /\bdetermine(s|d)?\b/i,
  /\bconverts?\b/i,
  /\bmaps?\b.*\bto\b/i,
  /\btriggers?\b/i,
  /\bproduces?\b/i,
  /\bexplains?\b.*\bhow\b/i,
  /\breturns?\b/i,
  /\bassigns?\b/i,
  /\bdecides?\b/i,
  /\bchooses?\b/i,
];

const PASSIVE_AGREEMENT_PATTERNS = [
  /^(yes|yeah|right|correct|true|agreed|i agree|that makes sense|sounds right|makes sense|good point)[.!]?$/i,
  /^(yes|yeah|right|correct|true|agreed|i agree|that makes sense|sounds right|makes sense|good point)\b/i,
  /^i (think|believe|guess|suppose) (so|that's right|you're right)$/i,
];

const TEST_REFERENCE_PATTERNS = [
  /\btest\b/i,
  /\bassert\b/i,
  /\bexpect\b/i,
  /\bshould\b.*\bpass\b/i,
  /\boutput\b.*\bmatch\b/i,
  /\boracle\b/i,
];

/**
 * Vocabulary-only: uses correct domain terminology but shows no mechanistic
 * understanding. Answer is short, contains domain terms but no substantive
 * causal/flow language, and makes no attempt at deeper reasoning.
 */
function isVocabularyOnly(answer: string, artifact?: ThinkingArtifact): boolean {
  const answerLower = answer.toLowerCase();
  const termCount = (answerLower.match(DOMAIN_TERMS_PATTERN) || []).length;

  // Count only substantive mechanism patterns (exclude superficial "maps to" usage)
  const substantiveMechanisms = MECHANISM_PATTERNS.slice(0, 13).filter((p) => p.test(answerLower)).length;

  // Has domain terms but no substantive mechanism language
  if (termCount >= 2 && substantiveMechanisms <= 1 && answer.length < 250) {
    return true;
  }

  // Very short answer with domain terms and no mechanism
  if (termCount >= 1 && answer.length < 80 && substantiveMechanisms === 0) {
    return true;
  }

  return false;
}

/**
 * Memorized without mechanism: can recite facts or structure but cannot
 * explain how or why. Answer contains factual statements but no causal
 * reasoning, and fails to connect concepts.
 */
function isMemorizedWithoutMechanism(
  answer: string,
  evidenceCheck: EvidenceCheck,
): boolean {
  const answerLower = answer.toLowerCase();
  const mechanismCount = MECHANISM_PATTERNS.filter((p) => p.test(answerLower)).length;

  // Has observable facts but missing causal reasoning — and has missing claims
  if (evidenceCheck.observed_claims.length > 0
    && evidenceCheck.missing_claims.length >= 2
    && mechanismCount <= 1
    && answer.length > 50) {
    return true;
  }

  // Recites structure but doesn't explain relationships
  // Uses "has", "includes", "is" etc. but no causal language
  const hasListingLanguage = /\b(have|has|is|are|contains|includes|consists of|part of|also)\b/i.test(answerLower);
  const hasCausalLanguage = /\b(because|therefore|leads to|depends on|causes|determines|converts|maps to|returns|assigns)\b/i.test(answerLower);

  if (hasListingLanguage && !hasCausalLanguage && mechanismCount <= 1 && answer.length > 80) {
    return true;
  }

  return false;
}

/**
 * Test-oracle misread: references tests or test evidence but draws wrong
 * conclusions from the test behavior/output.
 */
function isTestOracleMisread(answer: string, artifact?: ThinkingArtifact): boolean {
  const answerLower = answer.toLowerCase();
  const hasTestRef = TEST_REFERENCE_PATTERNS.some((p) => p.test(answerLower));
  if (!hasTestRef) return false;

  // Check if answer misinterprets the test's purpose
  const misreadPatterns = [
    /\b(test|tests?)\b.*\b(shows?|proves?|means?|indicates?)\b.*\b(wrong|incorrect|misleading|fails|false|broken)\b/i,
    /\b(assert|expect)\b.*\b(wrong|incorrect|misleading|fails|false)\b/i,
    /\boutput\b.*\b(match|incorrectly|wrong)\b/i,
    /\btest\b.*\b(not|doesn't|isn't|incorrect)\b.*\b(behavior|oracle|output|result)\b/i,
  ];

  for (const mp of misreadPatterns) {
    if (mp.test(answerLower)) return true;
  }

  // If answer mentions tests but takes a negative/contrary stance
  // while the answer is about code, not test behavior
  if (hasTestRef && /\b(implement|code|function|module|source)\b/i.test(answerLower)
    && !/\b(behavior|oracle|verify|validate|expected)\b/i.test(answerLower)
    && /\b(wrong|incorrect|not|misleading|broken)\b/i.test(answerLower)) {
    return true;
  }

  return false;
}

/**
 * Wrong mechanism: uses causal/reasoning language but the reasoning path
 * contradicts artifact evidence. The conclusion might be correct but the
 * mechanism described is wrong.
 */
function isWrongMechanism(
  answer: string,
  evidenceCheck: EvidenceCheck,
): boolean {
  const mechanismCount = MECHANISM_PATTERNS.filter((p) => p.test(answer.toLowerCase())).length;

  // Has causal/reasoning language but the reasoning is unsupported
  // or contradicted by evidence
  if (mechanismCount >= 1
    && (evidenceCheck.unsupported_claims.length > 0
      || evidenceCheck.contradicted_claims.length > 0)) {
    return true;
  }

  return false;
}

/**
 * Passive agreement: agrees with statements without constructing original
 * reasoning. Answer is primarily affirmative language without substantive
 * content.
 */
function isPassiveAgreement(answer: string): boolean {
  for (const pattern of PASSIVE_AGREEMENT_PATTERNS) {
    if (pattern.test(answer.trim())) {
      return true;
    }
  }

  // Short answers that are just agreement + brief follow-up
  if (answer.length < 100) {
    const agreementCount = PASSIVE_AGREEMENT_PATTERNS.filter((p) => p.test(answer)).length;
    const mechanismCount = MECHANISM_PATTERNS.filter((p) => p.test(answer)).length;
    if (agreementCount > 0 && mechanismCount === 0) {
      return true;
    }
  }

  return false;
}

// ── Utility Helpers ──────────────────────────────────────────────────

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9_-]+/)
    .filter((t) => t.length > 2)
    .filter((t) => !["the", "and", "for", "with", "that", "this", "from", "not", "are", "has", "its"].includes(t));
}

function scoreKeywordMatch(text: string, keywords: string[]): number {
  if (keywords.length === 0) return 0;
  let matched = 0;
  for (const kw of keywords) {
    if (text.includes(kw)) matched++;
  }
  return matched / keywords.length;
}

function extractArtifactTerminology(
  artifact: ThinkingArtifact,
  operation: UserOperation,
): Set<string> {
  const terms = new Set<string>();
  const sources = [
    artifact.title,
    artifact.purpose,
    operation.prompt,
    ...artifact.success_criteria,
    ...operation.success_criteria,
    ...artifact.source_evidence.map((r) => r.excerpt),
  ];
  for (const src of sources) {
    for (const t of extractKeywords(src)) {
      terms.add(t);
    }
  }
  return terms;
}

function isTechnicalTerm(term: string): boolean {
  const techPatterns = [
    /^[a-z]+_[a-z]+$/,          // snake_case identifiers
    /^(api|cli|ui|db|io|id|os|vm|ai|ml|rl)$/i,
    /^(repo|path|file|line|hash|ref|id|url)$/i,
    /^(async|await|promise|callback|stream|pipe)$/i,
    /^(import|export|require|module|package)$/i,
  ];
  return techPatterns.some((p) => p.test(term)) || term.length > 7;
}

/**
 * Convenience: full evaluation pipeline that creates an attempt, evaluates it,
 * and returns the complete result including gap taxonomy classification.
 */
export function captureAndEvaluate(input: {
  operation: UserOperation;
  artifact: ThinkingArtifact;
  answer_text: string;
  selected_evidence: string[];
  declared_confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
  evidenceInventory?: EvidenceInventoryEntry[];
}): {
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gapKind: OwnershipGapKind | null;
  isOverconfident: boolean;
  hasDeclaredUncertainty: boolean;
} {
  const attempt = createAttempt({
    operation_id: input.operation.id,
    answer_text: input.answer_text,
    selected_evidence: input.selected_evidence,
    declared_confidence: input.declared_confidence,
    declared_unknowns: input.declared_unknowns,
  });

  const evalResult = evaluateAttempt({
    attempt,
    operation: input.operation,
    artifact: input.artifact,
    evidenceInventory: input.evidenceInventory,
  });

  return {
    attempt,
    ...evalResult,
  };
}
