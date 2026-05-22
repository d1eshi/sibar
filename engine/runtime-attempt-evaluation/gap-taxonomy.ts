import type {
  EvidenceCheck,
  OwnershipGapKind,
  ThinkingArtifact,
  UserAttempt,
  UserOperation,
} from "../runtime-deep-ownership.ts";

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
 * Classify the specific gap kind based on attempt pattern and evidence check.
 */
export function classifyGapTaxonomy(
  attempt: UserAttempt,
  evidenceCheck: EvidenceCheck,
  _operation?: UserOperation,
  artifact?: ThinkingArtifact,
): OwnershipGapKind | null {
  if (evidenceCheck.result === "confirmed") {
    return null;
  }

  const answer = attempt.answer_text.trim();
  const answerLower = answer.toLowerCase();

  if (answer.length === 0 || /^i (do not|don't) know[.!]?$/i.test(answerLower)
    || /^(unsure|not sure|no idea)[.!]?$/i.test(answerLower)) {
    return "shallow_trace";
  }

  if (evidenceCheck.contradicted_claims.length > 0) {
    return "ignored_counterevidence";
  }

  if (attempt.declared_confidence === "high"
    && (evidenceCheck.result === "gap" || evidenceCheck.result === "insufficient_evidence")) {
    return "false_confidence";
  }

  if (isTestOracleMisread(answer, artifact)) {
    return "test_oracle_misread";
  }

  const substantiveMechanismCount = MECHANISM_PATTERNS
    .filter((pattern) => pattern.test(answerLower))
    .length;
  if (isWrongMechanism(answer, evidenceCheck) && substantiveMechanismCount >= 2) {
    return "wrong_mechanism";
  }

  if (isVocabularyOnly(answer)) {
    return "vocabulary_only";
  }

  if (isMemorizedWithoutMechanism(answer, evidenceCheck)) {
    return "memorized_without_mechanism";
  }

  if (isWrongMechanism(answer, evidenceCheck)) {
    return "wrong_mechanism";
  }

  if (isPassiveAgreement(answer)) {
    return "passive_agreement";
  }

  if (evidenceCheck.unsupported_claims.length > 0) {
    return "unsupported_claim";
  }

  if (evidenceCheck.missing_claims.length > 0) {
    return "missing_prerequisite";
  }

  return "shallow_trace";
}

function isVocabularyOnly(answer: string): boolean {
  const answerLower = answer.toLowerCase();
  const termCount = (answerLower.match(DOMAIN_TERMS_PATTERN) || []).length;
  const substantiveMechanisms = MECHANISM_PATTERNS
    .slice(0, 13)
    .filter((pattern) => pattern.test(answerLower))
    .length;

  if (termCount >= 2 && substantiveMechanisms <= 1 && answer.length < 250) {
    return true;
  }

  if (termCount >= 1 && answer.length < 80 && substantiveMechanisms === 0) {
    return true;
  }

  return false;
}

function isMemorizedWithoutMechanism(answer: string, evidenceCheck: EvidenceCheck): boolean {
  const answerLower = answer.toLowerCase();
  const mechanismCount = MECHANISM_PATTERNS.filter((pattern) => pattern.test(answerLower)).length;

  if (evidenceCheck.observed_claims.length > 0
    && evidenceCheck.missing_claims.length >= 2
    && mechanismCount <= 1
    && answer.length > 50) {
    return true;
  }

  const hasListingLanguage = /\b(have|has|is|are|contains|includes|consists of|part of|also)\b/i.test(answerLower);
  const hasCausalLanguage = /\b(because|therefore|leads to|depends on|causes|determines|converts|maps to|returns|assigns)\b/i.test(answerLower);

  return hasListingLanguage && !hasCausalLanguage && mechanismCount <= 1 && answer.length > 80;
}

function isTestOracleMisread(answer: string, _artifact?: ThinkingArtifact): boolean {
  const answerLower = answer.toLowerCase();
  const hasTestReference = TEST_REFERENCE_PATTERNS.some((pattern) => pattern.test(answerLower));
  if (!hasTestReference) return false;

  const misreadPatterns = [
    /\b(test|tests?)\b.*\b(shows?|proves?|means?|indicates?)\b.*\b(wrong|incorrect|misleading|fails|false|broken)\b/i,
    /\b(assert|expect)\b.*\b(wrong|incorrect|misleading|fails|false)\b/i,
    /\boutput\b.*\b(match|incorrectly|wrong)\b/i,
    /\btest\b.*\b(not|doesn't|isn't|incorrect)\b.*\b(behavior|oracle|output|result)\b/i,
  ];

  if (misreadPatterns.some((pattern) => pattern.test(answerLower))) {
    return true;
  }

  return hasTestReference
    && /\b(implement|code|function|module|source)\b/i.test(answerLower)
    && !/\b(behavior|oracle|verify|validate|expected)\b/i.test(answerLower)
    && /\b(wrong|incorrect|not|misleading|broken)\b/i.test(answerLower);
}

function isWrongMechanism(answer: string, evidenceCheck: EvidenceCheck): boolean {
  const mechanismCount = MECHANISM_PATTERNS.filter((pattern) => pattern.test(answer.toLowerCase())).length;
  return mechanismCount >= 1
    && (evidenceCheck.unsupported_claims.length > 0 || evidenceCheck.contradicted_claims.length > 0);
}

function isPassiveAgreement(answer: string): boolean {
  for (const pattern of PASSIVE_AGREEMENT_PATTERNS) {
    if (pattern.test(answer.trim())) {
      return true;
    }
  }

  if (answer.length < 100) {
    const agreementCount = PASSIVE_AGREEMENT_PATTERNS.filter((pattern) => pattern.test(answer)).length;
    const mechanismCount = MECHANISM_PATTERNS.filter((pattern) => pattern.test(answer)).length;
    if (agreementCount > 0 && mechanismCount === 0) {
      return true;
    }
  }

  return false;
}
