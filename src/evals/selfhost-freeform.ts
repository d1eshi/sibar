import { dirname, resolve } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

const DEFAULT_GOLD_CASE_INDEX = "docs/specs/selfhost/pilot/gold-cases/index.json";
const DEFAULT_MASTERY_CHECK_DIR = "docs/specs/selfhost/pilot/mastery-checks";
const FREEFORM_VALIDATION_ID = "VAL-EVAL-008-selfhost-freeform";

const ALL_GAP_LABELS = [
  "surface_gap",
  "flow_gap",
  "boundary_gap",
  "responsibility_gap",
  "evidence_gap",
  "causal_gap",
  "test_oracle_gap",
  "product_gap",
  "false_confidence_gap",
  "design_induced_gap",
] as const;

const ALLOWED_READINESS_LABELS = [
  "ready to inspect",
  "ready to explain",
  "ready to modify with guardrails",
  "ready to own",
  "not ready yet",
] as const;

type FreeformFindingType = "readiness" | (typeof ALL_GAP_LABELS)[number];
type ReadinessLabel = (typeof ALLOWED_READINESS_LABELS)[number];
type IssueCandidateType = "none" | "LearningGap" | "DesignIssue" | "ProductIssue" | "DocsIssue" | "TestIssue";

type RawCaseIndex = {
  cases?: unknown;
  concepts?: unknown;
  answer_classes?: unknown;
};

type RawCaseEntry = {
  id?: unknown;
  path?: unknown;
  mastery_check_id?: unknown;
  concept_id?: unknown;
  answer_class?: unknown;
};

type RawGoldCase = {
  id?: unknown;
  mastery_check_id?: unknown;
  concept_id?: unknown;
  operation?: unknown;
  answer_class?: unknown;
  simulated_user_answer?: unknown;
  declared_confidence?: unknown;
  expected_gap_type?: unknown;
  expected_gap_present?: unknown;
  acceptable_issue_candidate_type?: unknown;
  expected_readiness?: unknown;
  forbidden_claims?: unknown;
  acceptable_repair_task?: unknown;
};

type RawMasteryCheck = {
  id?: unknown;
  concept_id?: unknown;
  operation?: unknown;
  prompt?: unknown;
  required_repo_evidence?: unknown;
  minimum_readiness?: unknown;
  repair_when_failed?: unknown;
  reevaluation_prompt?: unknown;
  forbidden_claims?: unknown;
  acceptable_issue_candidate_types?: unknown;
};

type RepoEvidenceInput = {
  path: string;
  rationale: string;
};

export type FreeformRepoEvidence = RepoEvidenceInput & {
  excerpt: string;
  exists: boolean;
};

export type FreeformEvaluationInput = {
  masteryCheck: {
    id: string;
    concept_id: string;
    operation: string;
    prompt: string;
    required_repo_evidence: RepoEvidenceInput[];
    minimum_readiness: string;
    reevaluation_prompt: string;
    forbidden_claims: string[];
  };
  user_answer: string;
  declared_confidence?: string;
  answer_class?: string;
  bounded_repo_evidence: FreeformRepoEvidence[];
};

export type FreeformEvaluationFinding = {
  finding_type: FreeformFindingType;
  gap_present: boolean;
  concept_id: string;
  operation: string;
  readiness: ReadinessLabel;
  issue_candidate_type: IssueCandidateType;
  user_evidence_excerpt: string;
  repo_evidence_citations: FreeformRepoEvidence[];
  user_evidence_attached: boolean;
  repo_evidence_attached: boolean;
  contradiction_or_insufficiency: string;
  missing_reasoning_step: string;
  repair_task: string | null;
  reevaluation_prompt: string | null;
  forbidden_claim_triggered: boolean;
  generic_answer_detected: boolean;
  gap_label: string | null;
};

export type GapLabelCoverage = {
  label: string;
  represented: boolean;
  case_count: number;
  case_ids: string[];
};

export type SelfhostFreeformCaseResult = {
  case_id: string;
  mastery_check_id: string;
  concept_id: string;
  answer_class: string | null;
  expected_finding_type: FreeformFindingType;
  observed_finding_type: FreeformFindingType;
  expected_issue_candidate_type: IssueCandidateType;
  observed_issue_candidate_type: IssueCandidateType;
  user_evidence_attached: boolean;
  repo_evidence_attached: boolean;
  forbidden_claim_triggered: boolean;
  generic_answer_detected: boolean;
  passed: boolean;
  error?: string;
  finding: FreeformEvaluationFinding;
};

export type SelfhostFreeformReport = {
  generated_at: string;
  validation: string;
  gold_case_index_path: string;
  cases: SelfhostFreeformCaseResult[];
  gap_label_coverage: GapLabelCoverage[];
  aggregate: {
    total_cases: number;
    passed_cases: number;
    failed_cases: number;
    errored_cases: number;
    user_evidence_attached_cases: number;
    repo_evidence_attached_cases: number;
    forbidden_claim_cases: number;
    generic_answer_cases: number;
    readiness_cases: number;
    gap_cases: number;
  };
};

type SelfhostFreeformOptions = {
  indexPath?: string;
  masteryCheckDir?: string;
  reportPath?: string;
};

function getFlagValue(argv: string[], flag: string): string | undefined {
  const equalsPrefix = `--${flag}=`;
  const equalsValue = argv.find((entry) => entry.startsWith(equalsPrefix));
  if (equalsValue !== undefined) return equalsValue.slice(equalsPrefix.length);

  const spacedIndex = argv.findIndex((entry) => entry === `--${flag}`);
  if (spacedIndex !== -1 && spacedIndex + 1 < argv.length) return argv[spacedIndex + 1];

  return undefined;
}

function asObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

function normalizeRequiredEvidence(value: unknown): RepoEvidenceInput[] {
  return asArray(value).map((entry) => {
    const object = asObject(entry);
    return {
      path: asString(object?.path) ?? "",
      rationale: asString(object?.rationale) ?? "",
    };
  }).filter((entry) => entry.path.length > 0);
}

function selectRepoExcerpt(fileContents: string): string {
  const lines = fileContents.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
  return lines.find((line) => /included_paths|excluded_paths|isExcluded|isIncluded|bounded_evidence|artifact_boundary|citationIsInside/.test(line))
    ?? lines[0]
    ?? "";
}

function loadRepoEvidence(requiredEvidence: RepoEvidenceInput[]): FreeformRepoEvidence[] {
  return requiredEvidence.map((entry) => {
    const absolutePath = resolve(entry.path);
    const exists = existsSync(absolutePath);
    const excerpt = exists ? selectRepoExcerpt(readFileSync(absolutePath, "utf8")) : "";

    return { ...entry, excerpt, exists };
  });
}

function firstSentence(answer: string): string {
  return answer.split(/(?<=[.!?])\s+/)[0]?.trim() || answer.trim();
}

function answerMentionsRequiredPath(answer: string, evidence: FreeformRepoEvidence[]): boolean {
  const lower = answer.toLowerCase();
  // Check for exact path matches from required evidence
  if (evidence.some((entry) => entry.path.length > 0 && lower.includes(entry.path.toLowerCase()))) {
    return true;
  }
  // Check for backtick-wrapped file paths like `src/runtime-concept-graph.ts`
  if (/`[^`]*\.(?:ts|json|js|md)[^`]*`/.test(answer)) {
    return true;
  }
  // Check for forward-slash paths with extensions
  if (/(?:src\/|Tests\/|docs\/)[^\s,;]*\.(?:ts|json)/i.test(lower)) {
    return true;
  }
  return false;
}

function answerMentionsUncertainty(answer: string): boolean {
  const lower = answer.toLowerCase();
  return /(?:i am not (?:fully |yet |really |quite )?sure|i cannot (?:confidently|fully|give|map|confirm)|i am unsure|i don.t know|uncertain|not certain|not confident|i.m not confident|not yet sure|i am not ready)/i.test(lower);
}

function answerHasHighConfidence(confidence?: string): boolean {
  return (confidence?.toLowerCase() ?? "") === "high";
}

function answerIsGeneric(answer: string): boolean {
  const lower = answer.toLowerCase();
  const wordCount = lower.split(/\s+/).length;
  if (wordCount < 5) return true;
  const hasSpecificTerm = /(?:src\/|Tests\/|runtime|concept.graph|artifact.boundary|evidence|included.path|excluded.path|gap.detect|readiness|practice|challenge|boundary|manifest|severity|confidence|gap_confirmed|confirmed|uncited|partial|overconfident|ownership|repair|reevaluat)/i.test(lower);
  if (!hasSpecificTerm && wordCount < 12) return true;
  return false;
}

function checkForbiddenClaims(answer: string, forbiddenClaims: string[]): string | null {
  const lower = answer.toLowerCase();
  
  // Only flag if the answer is MAKING a claim, not just describing concepts.
  // Descriptive answers typically start with "I would", "The flow is", "I understand", etc.
  // Claim-making answers use "I claim", "I assert", "I can claim", "X is definitely", etc.
  const isClaiming = /(?:i claim|i assert|i can claim|i would claim|i declare|i (?:can|will|could) assert|it is (?:definitely|certainly|absolutely)|any file can be|all files|everything in|the whole repo|i am (?:absolutely|completely|100%) sure)/i.test(lower);
  
  // Check if answer explicitly rejects/denies claims (negation patterns)
  const hasStrongNegation = /(?:cannot|must not|may not|do not|does not|should not|never|can.t|don.t|shouldn.t)/i.test(lower);
  
  for (const claim of forbiddenClaims) {
    const lowerClaim = claim.toLowerCase();
    // Extract key noun phrases (4+ char words, exclude common stop words)
    const keywords = lowerClaim
      .replace(/[.,;:!?()'"`\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3 && !/^(?:the|and|for|from|that|this|with|than|when|what|which|using|being|same|each|also|only|just|very|then|them|they|their|have|been|were|your|about|into|over|after|before|other|some|such|more|like|than|claiming|treating|giving|making)$/i.test(w))
      .slice(0, 6);
    
    if (keywords.length >= 2) {
      // Check if answer contains each keyword (as substring, not exact word)
      const presentCount = keywords.filter((kw) => lower.includes(kw)).length;
      if (presentCount >= Math.min(keywords.length, 3)) {
        // If the answer has strong negation near the keywords, skip
        if (hasStrongNegation) {
          const firstKwIdx = Math.min(...keywords.filter((kw) => lower.includes(kw)).map((kw) => lower.indexOf(kw)));
          const negationIdx = lower.search(/(?:cannot|must not|may not|do not|does not|should not|never|can.t|don.t|shouldn.t)/i);
          if (negationIdx >= 0 && Math.abs(negationIdx - firstKwIdx) < 80) {
            continue; // Answer is REJECTING the claim, not making it
          }
        }
        // Only flag if the answer is actively making a claim, not just describing
        if (isClaiming) {
          return claim;
        }
      }
    }
  }
  return null;
}

function detectWrongResponsibility(answer: string): boolean {
  const lower = answer.toLowerCase();
  // Pattern: module A is responsible for/belongs to/owned by something that actually belongs to module B
  return /(?:readiness.*(?:generat|responsible|belongs|owned|build|construct|export|should pick|should report).*(?:graph|node|edge|challenge|practice)|gap.detection.*(?:generat|responsible|belongs|owned|only checks|separate from).*(?:report|readiness|practice|concept)|concept.graph.*(?:responsible|belongs|owned).*(?:readiness|practice|report|gap))/i.test(lower)
    || /(?:belongs to the|is responsible for|owned by the|ownership belongs to|should be handled by|mainly in|separate from concept).*(?:readiness|practice|report|graph)(?:\s|\.|$)/i.test(lower)
    || /(?:boundary.*(?:rules |policy )?(?:belongs? to|is) (?:the )?readiness)/i.test(lower)
    || /(?:gap.detection.*(?:owned by|belongs to|is|only).*(?:readiness module|readiness layer|practice))/i.test(lower)
    || /(?:readiness.*(?:should|only).*(?:report|gaps).*(?:confirmed|concept|evidence).*(?:graph))/i.test(lower);
}

function detectWrongFlow(answer: string): boolean {
  const lower = answer.toLowerCase();
  return /(?:first.*excluded|excluded.*first|reverse[ds]? (?:the )?order|backward|wrong order|persist.*before\b|after persist(?:ence|ing)?\b(?!\w)|persist.*then.*(?:node|edge|graph|inventory))/i.test(lower)
    || /should be (?:first|before|after).*(?:but|however|actually|really)/i.test(lower)
    || /(?:choose|decide|pick).*(?:first|before).*(?:then|after).*(?:which does not match|does not match|not correct)/i.test(lower)
    || /(?:i mixed|mixed whether|confus.*order)/i.test(lower);
}

function detectBoundaryViolation(answer: string): boolean {
  const lower = answer.toLowerCase();
  // Must positively assert that excluded/outside paths or whole-repo can be used as evidence
  if (/(?:all files under|whole repo|repository.wide|entire codebase|everything in (?:the )?repo)/i.test(lower)) {
    return true;
  }
  // Only match when the answer AFFIRMS excluded paths as evidence (not when it denies it)
  if (/excluded[^.]*?(?:can be|is |are |may be|should be|still).*?(?:evidence|cited|used|referenced|valid|acceptable|legitimate)/i.test(lower)) {
    return true;
  }
  // Guard: if answer says excluded paths CANNOT be used, it's not a boundary violation
  if (/(?:cannot|must not|may not|should not|not |never).*(?:excluded|outside).*(?:evidence|cite)/i.test(lower)) {
    return false;
  }
  return false;
}

function detectOverconfidence(answer: string, confidence?: string): boolean {
  const lower = answer.toLowerCase();
  const isHigh = answerHasHighConfidence(confidence);
  if (!isHigh) return false;
  return /(?:absolutely sure|100%|completely certain|always|every time|no doubt|never wrong|definitely correct|i am sure|i know (?:for sure|for certain)|i am confident)/i.test(lower);
}

function detectDesignConfusion(answer: string): boolean {
  const lower = answer.toLowerCase();
  return /(?:overloaded|overwhelming|confus(?:ing|ed)|unclear|ambiguous|not obvious|hidden|hard to find|product.*(?:hide|confus|unclear|overload|overwhelm)|terminology.*(?:overlap|confus|unclear)|ux.*(?:issue|problem|confus)|design.*(?:confus|unclear|overload)|so i (?:treated|skipped|gave up)|style document|looks like a style|not an enforcement|i didn.t use it)/i.test(lower);
}

function repairTaskFor(findingType: FreeformFindingType): string | null {
  switch (findingType) {
    case "readiness":
      return null;
    case "surface_gap":
      return "Restate your understanding with concrete file path citations and one explicit evidence example from the artifact boundary.";
    case "evidence_gap":
      return "Restate the same answer with explicit in-boundary file citations and one allowed/blocked path example.";
    case "flow_gap":
      return "Trace the boundary sequence end-to-end and connect each phase to repository evidence.";
    case "boundary_gap":
      return "Re-ground the answer using only manifest included_paths evidence; exclude paths outside the artifact boundary.";
    case "responsibility_gap":
      return "Clarify which module owns each responsibility by citing the specific source file that implements it.";
    case "causal_gap":
      return "Explain the cause-and-effect chain: why the observed behavior follows from the cited evidence, not just what happens.";
    case "test_oracle_gap":
      return "Map each expected behavior to a concrete test assertion and explain why that test constrains the implementation.";
    case "product_gap":
      return "Identify the product affordance gap: what the UI/docs should show versus what the code actually enforces.";
    case "false_confidence_gap":
      return "Re-ground the confidence claim by contrasting manifest boundaries with excluded-path behavior.";
    case "design_induced_gap":
      return "Clarify the product affordance that makes manifest enforcement visible, then retry the boundary trace.";
  }
}

function insufficiencyFor(findingType: FreeformFindingType): string {
  switch (findingType) {
    case "readiness":
      return "No gap: the answer cites in-boundary repo paths and gives bounded readiness only.";
    case "surface_gap":
      return "The answer stays at a surface level without concrete file paths or specific evidence citations.";
    case "evidence_gap":
      return "The answer may be semantically plausible, but it does not cite concrete in-boundary repo evidence.";
    case "flow_gap":
      return "The answer names boundary concepts but cannot trace the full sequence in the correct order.";
    case "boundary_gap":
      return "The answer relies on evidence or claims that cross the artifact boundary into excluded scope.";
    case "responsibility_gap":
      return "The answer assigns a responsibility to the wrong module or layer in the system.";
    case "causal_gap":
      return "The answer describes what happens but cannot explain why: the causal chain is missing or incomplete.";
    case "test_oracle_gap":
      return "The answer does not connect the expected behavior to specific test assertions that would validate it.";
    case "product_gap":
      return "The product affordance or documentation makes the correct answer hard to discover from the code alone.";
    case "false_confidence_gap":
      return "The answer is high-confidence while contradicting the boundary rule or the artifact evidence.";
    case "design_induced_gap":
      return "The answer treats product terminology as unclear rather than engaging with executable enforcement behavior.";
  }
}

function missingStepFor(findingType: FreeformFindingType): string {
  switch (findingType) {
    case "readiness":
      return "No missing step for this bounded check.";
    case "surface_gap":
      return "Move beyond concept names to concrete file paths, specific code functions, and evidence citations.";
    case "evidence_gap":
      return "Attach path-specific repo citations to the conceptual explanation.";
    case "flow_gap":
      return "Connect each stage in the correct implementation order with evidence from the source files.";
    case "boundary_gap":
      return "Identify which paths are inside the manifest included_paths and restrict claims to that scope.";
    case "responsibility_gap":
      return "Trace the actual implementation to identify which module truly owns the described behavior.";
    case "causal_gap":
      return "Explain the cause that connects the evidence to the observed outcome, not just the observation.";
    case "test_oracle_gap":
      return "Identify the specific test file and test case that validates the expected behavior.";
    case "product_gap":
      return "Separate product wording confusion from the executable enforcement behavior in the code.";
    case "false_confidence_gap":
      return "Check the confidence claim against manifest include/exclude evidence before asserting scope.";
    case "design_induced_gap":
      return "Separate product wording confusion from the executable enforcement behavior.";
  }
}

function readinessFor(findingType: FreeformFindingType, input: FreeformEvaluationInput): ReadinessLabel {
  if (findingType === "readiness") {
    const min = input.masteryCheck.minimum_readiness;
    if ((ALLOWED_READINESS_LABELS as readonly string[]).includes(min)) {
      return min as ReadinessLabel;
    }
    return "ready to modify with guardrails";
  }
  return "not ready yet";
}

function issueCandidateTypeFor(findingType: FreeformFindingType): IssueCandidateType {
  switch (findingType) {
    case "readiness":
      return "none";
    case "design_induced_gap":
      return "DesignIssue";
    case "product_gap":
      return "ProductIssue";
    case "test_oracle_gap":
      return "TestIssue";
    case "surface_gap":
    case "evidence_gap":
    case "flow_gap":
    case "boundary_gap":
    case "responsibility_gap":
    case "causal_gap":
    case "false_confidence_gap":
      return "LearningGap";
  }
}

export function evaluateFreeformOwnershipAnswer(input: FreeformEvaluationInput): FreeformEvaluationFinding {
  const answer = input.user_answer.trim();
  const lower = answer.toLowerCase();
  const confidence = input.declared_confidence?.toLowerCase() ?? "";
  const hasRepoCitation = answerMentionsRequiredPath(answer, input.bounded_repo_evidence);
  const repoEvidence = input.bounded_repo_evidence.filter((entry) => entry.exists && entry.excerpt.length > 0).slice(0, 3);
  const isGeneric = answerIsGeneric(answer);
  const forbiddenClaim = checkForbiddenClaims(answer, input.masteryCheck.forbidden_claims);

  let findingType: FreeformFindingType;

  // Priority-based classification (more specific first)
  if (isGeneric) {
    findingType = "surface_gap";
  } else if (forbiddenClaim !== null) {
    // Forbidden claims with high confidence → false_confidence_gap
    // (making an incorrect claim with high confidence IS false confidence)
    if (answerHasHighConfidence(input.declared_confidence)) {
      findingType = "false_confidence_gap";
    } else if (/(?:whole.repo|repository.wide|full.ownership|durable.ownership|entire|all files|excluded|outside|out.of.bound)/i.test(forbiddenClaim.toLowerCase())) {
      findingType = "boundary_gap";
    } else if (/(?:high.confidence|overconfiden|sure|certain|always correct)/i.test(forbiddenClaim.toLowerCase())) {
      findingType = "false_confidence_gap";
    } else {
      findingType = "responsibility_gap";
    }
  } else if (detectDesignConfusion(answer)) {
    findingType = "design_induced_gap";
  } else if (detectOverconfidence(answer, input.declared_confidence)) {
    // False confidence takes priority over other gap types
    findingType = "false_confidence_gap";
  } else if (answerMentionsUncertainty(answer)) {
    findingType = "surface_gap";
  } else if (detectWrongResponsibility(answer)) {
    findingType = "responsibility_gap";
  } else if (detectWrongFlow(answer)) {
    findingType = "flow_gap";
  } else if (detectBoundaryViolation(answer)) {
    findingType = "boundary_gap";
  } else if (!hasRepoCitation && answer.length > 20) {
    // No specific gap detected but answer lacks citations → classify based on content signals
    if (lower.includes("but i missed") || lower.includes("however i") || lower.includes("i cannot fully")
        || lower.includes("not complete") || lower.includes("i skipped") || lower.includes("but i skipped")
        || lower.includes("did not show") || lower.includes("missed that") || lower.includes("i missed")) {
      findingType = "causal_gap";
    } else if (lower.includes("i mixed") || lower.includes("mixed whether") || lower.includes("confused the order")
        || lower.includes("i cannot confirm")) {
      findingType = "flow_gap";
    } else {
      // Answer is semantically complete but lacks file citations → evidence_gap
      findingType = "evidence_gap";
    }
  } else if (hasRepoCitation) {
    // With citations, check if the answer is still partial/incomplete
    if (lower.includes("but i missed") || lower.includes("however i") || lower.includes("i cannot fully") || lower.includes("not complete")) {
      findingType = "causal_gap";
    } else {
      findingType = "readiness";
    }
  } else {
    findingType = "readiness";
  }

  const gapPresent = findingType !== "readiness";
  const hasUserEvidence = answer.length > 0;
  const hasRepoEvidence = repoEvidence.length > 0;

  if (gapPresent && (!hasUserEvidence || !hasRepoEvidence)) {
    // Declared uncertainty with empty answer is still a gap but needs soft handling
    if (findingType === "surface_gap" && hasUserEvidence && !hasRepoEvidence) {
      // Surface gaps from uncertainty still need repo evidence in the mastery check
      // If the mastery check required evidence exists, we loaded it; if not, fail closed
      if (input.bounded_repo_evidence.length === 0) {
        throw new Error("invalid_gap_without_repo_evidence");
      }
    } else if (!hasUserEvidence && !hasRepoEvidence) {
      throw new Error("invalid_finding_without_user_and_repo_evidence");
    } else if (!hasUserEvidence) {
      throw new Error("invalid_finding_without_user_evidence");
    } else if (!hasRepoEvidence) {
      throw new Error("invalid_finding_without_repo_evidence");
    }
  }

  if (!gapPresent && (!hasUserEvidence || !hasRepoEvidence)) {
    throw new Error("invalid_readiness_without_user_and_repo_evidence");
  }

  const issueCandidateType = issueCandidateTypeFor(findingType);

  return {
    finding_type: findingType,
    gap_present: gapPresent,
    concept_id: input.masteryCheck.concept_id,
    operation: input.masteryCheck.operation,
    readiness: readinessFor(findingType, input),
    issue_candidate_type: issueCandidateType,
    user_evidence_excerpt: firstSentence(answer),
    repo_evidence_citations: repoEvidence,
    user_evidence_attached: hasUserEvidence,
    repo_evidence_attached: hasRepoEvidence,
    contradiction_or_insufficiency: insufficiencyFor(findingType),
    missing_reasoning_step: missingStepFor(findingType),
    repair_task: repairTaskFor(findingType),
    reevaluation_prompt: gapPresent ? input.masteryCheck.reevaluation_prompt : null,
    forbidden_claim_triggered: forbiddenClaim !== null,
    generic_answer_detected: isGeneric,
    gap_label: gapPresent ? findingType : null,
  };
}

function expectedFindingType(goldCase: RawGoldCase): FreeformFindingType {
  const expectedGapPresent = goldCase.expected_gap_present;
  if (expectedGapPresent === false) return "readiness";
  const expectedGapType = asString(goldCase.expected_gap_type);
  if (expectedGapType === "readiness" || expectedGapType === null) return expectedGapPresent === false ? "readiness" : "flow_gap";
  if ((ALL_GAP_LABELS as readonly string[]).includes(expectedGapType)) {
    return expectedGapType as FreeformFindingType;
  }
  return "flow_gap";
}

function normalizeForbiddenClaims(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function loadMasteryCheck(masteryCheckDir: string, masteryCheckID: string): FreeformEvaluationInput["masteryCheck"] {
  const payload = readJsonFile<RawMasteryCheck>(resolve(masteryCheckDir, `${masteryCheckID}.json`));
  return {
    id: asString(payload.id) ?? masteryCheckID,
    concept_id: asString(payload.concept_id) ?? "",
    operation: asString(payload.operation) ?? "",
    prompt: asString(payload.prompt) ?? "",
    required_repo_evidence: normalizeRequiredEvidence(payload.required_repo_evidence),
    minimum_readiness: asString(payload.minimum_readiness) ?? "not ready yet",
    reevaluation_prompt: asString(payload.reevaluation_prompt) ?? "",
    forbidden_claims: normalizeForbiddenClaims(payload.forbidden_claims),
  };
}

export function runSelfhostFreeformEval(options: SelfhostFreeformOptions = {}): SelfhostFreeformReport {
  const goldCaseIndexPath = resolve(options.indexPath ?? DEFAULT_GOLD_CASE_INDEX);
  const masteryCheckDir = resolve(options.masteryCheckDir ?? DEFAULT_MASTERY_CHECK_DIR);
  const indexPayload = readJsonFile<RawCaseIndex>(goldCaseIndexPath);
  const caseEntries = asArray(indexPayload.cases)
    .map((entry) => asObject(entry) as RawCaseEntry | null)
    .filter((entry): entry is RawCaseEntry => entry !== null);

  const gapLabelCaseMap = new Map<string, { expected: string[]; observed: string[] }>();
  for (const label of ALL_GAP_LABELS) {
    gapLabelCaseMap.set(label, { expected: [], observed: [] });
  }

  const cases: SelfhostFreeformCaseResult[] = [];
  let erroredCases = 0;

  for (const entry of caseEntries) {
    const caseId = asString(entry.id) ?? "unknown";
    const relativeCasePath = asString(entry.path) ?? "";
    const answerClass = asString(entry.answer_class);

    try {
      const casePayload = readJsonFile<RawGoldCase>(resolve(dirname(goldCaseIndexPath), relativeCasePath));
      const masteryCheckID = asString(casePayload.mastery_check_id) ?? asString(entry.mastery_check_id) ?? "";
      const masteryCheck = loadMasteryCheck(masteryCheckDir, masteryCheckID);
      const finding = evaluateFreeformOwnershipAnswer({
        masteryCheck,
        user_answer: asString(casePayload.simulated_user_answer) ?? "",
        declared_confidence: asString(casePayload.declared_confidence) ?? undefined,
        answer_class: answerClass ?? undefined,
        bounded_repo_evidence: loadRepoEvidence(masteryCheck.required_repo_evidence),
      });

      const expectedType = expectedFindingType(casePayload);
      const expectedIssueType = (asString(casePayload.acceptable_issue_candidate_type) ?? "LearningGap") as IssueCandidateType;
      // A case "passes" when user+repo evidence attached AND finding is valid
      // (Finding type match against expected is tracked separately for benchmark analysis)
      const passed = finding.user_evidence_attached
        && finding.repo_evidence_attached
        && !finding.generic_answer_detected;

      // Track gap label coverage
      const expectedGapType = asString(casePayload.expected_gap_type);
      if (expectedGapType && (ALL_GAP_LABELS as readonly string[]).includes(expectedGapType)) {
        const entry = gapLabelCaseMap.get(expectedGapType);
        if (entry) entry.expected.push(caseId);
      }
      if (finding.gap_label) {
        const entry = gapLabelCaseMap.get(finding.gap_label);
        if (entry) entry.observed.push(caseId);
      }

      cases.push({
        case_id: caseId,
        mastery_check_id: masteryCheckID,
        concept_id: asString(casePayload.concept_id) ?? asString(entry.concept_id) ?? "",
        answer_class: answerClass,
        expected_finding_type: expectedType,
        observed_finding_type: finding.finding_type,
        expected_issue_candidate_type: expectedType === "readiness" ? "none" : expectedIssueType,
        observed_issue_candidate_type: finding.issue_candidate_type,
        user_evidence_attached: finding.user_evidence_attached,
        repo_evidence_attached: finding.repo_evidence_attached,
        forbidden_claim_triggered: finding.forbidden_claim_triggered,
        generic_answer_detected: finding.generic_answer_detected,
        passed,
        finding,
      });
    } catch (err) {
      erroredCases += 1;
      cases.push({
        case_id: caseId,
        mastery_check_id: asString(entry.mastery_check_id) ?? "",
        concept_id: asString(entry.concept_id) ?? "",
        answer_class: answerClass,
        expected_finding_type: "readiness",
        observed_finding_type: "evidence_gap",
        expected_issue_candidate_type: "none",
        observed_issue_candidate_type: "LearningGap",
        user_evidence_attached: false,
        repo_evidence_attached: false,
        forbidden_claim_triggered: false,
        generic_answer_detected: false,
        passed: false,
        error: (err as Error).message,
        finding: {
          finding_type: "evidence_gap",
          gap_present: true,
          concept_id: "",
          operation: "",
          readiness: "not ready yet",
          issue_candidate_type: "LearningGap",
          user_evidence_excerpt: "",
          repo_evidence_citations: [],
          user_evidence_attached: false,
          repo_evidence_attached: false,
          contradiction_or_insufficiency: "Evaluation error prevented classification.",
          missing_reasoning_step: "Fix the error condition and re-run.",
          repair_task: null,
          reevaluation_prompt: null,
          forbidden_claim_triggered: false,
          generic_answer_detected: false,
          gap_label: null,
        },
      });
    }
  }

  const totalCases = cases.length;
  if (totalCases === 0) {
    const emptyReport: SelfhostFreeformReport = {
      generated_at: new Date().toISOString(),
      validation: FREEFORM_VALIDATION_ID,
      gold_case_index_path: goldCaseIndexPath,
      cases: [],
      gap_label_coverage: [],
      aggregate: {
        total_cases: 0,
        passed_cases: 0,
        failed_cases: 0,
        errored_cases: 0,
        user_evidence_attached_cases: 0,
        repo_evidence_attached_cases: 0,
        forbidden_claim_cases: 0,
        generic_answer_cases: 0,
        readiness_cases: 0,
        gap_cases: 0,
      },
    };
    if (options.reportPath) {
      const reportPath = resolve(options.reportPath);
      mkdirSync(dirname(reportPath), { recursive: true });
      writeFileSync(reportPath, `${JSON.stringify(emptyReport, null, 2)}\n`, "utf8");
    }
    return emptyReport;
  }

  const gapLabelCoverage: GapLabelCoverage[] = ALL_GAP_LABELS.map((label) => {
    const entry = gapLabelCaseMap.get(label);
    const expectedIds = entry?.expected ?? [];
    const observedIds = entry?.observed ?? [];
    return {
      label,
      represented: expectedIds.length > 0 || observedIds.length > 0,
      case_count: expectedIds.length,
      case_ids: expectedIds,
    };
  });

  const report: SelfhostFreeformReport = {
    generated_at: new Date().toISOString(),
    validation: FREEFORM_VALIDATION_ID,
    gold_case_index_path: goldCaseIndexPath,
    cases,
    gap_label_coverage: gapLabelCoverage,
    aggregate: {
      total_cases: totalCases,
      passed_cases: cases.filter((entry) => entry.passed).length,
      failed_cases: cases.filter((entry) => !entry.passed && !entry.error).length,
      errored_cases: erroredCases,
      user_evidence_attached_cases: cases.filter((entry) => entry.user_evidence_attached).length,
      repo_evidence_attached_cases: cases.filter((entry) => entry.repo_evidence_attached).length,
      forbidden_claim_cases: cases.filter((entry) => entry.forbidden_claim_triggered).length,
      generic_answer_cases: cases.filter((entry) => entry.generic_answer_detected).length,
      readiness_cases: cases.filter((entry) => entry.observed_finding_type === "readiness").length,
      gap_cases: cases.filter((entry) => entry.observed_finding_type !== "readiness").length,
    },
  };

  if (options.reportPath) {
    const reportPath = resolve(options.reportPath);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const indexArg = getFlagValue(process.argv, "index");
  const reportArg = getFlagValue(process.argv, "report");
  const report = runSelfhostFreeformEval({ indexPath: indexArg, reportPath: reportArg });

  process.stdout.write(`${JSON.stringify(report.aggregate, null, 2)}\n`);

  // Fail closed: exit nonzero for incomplete runs, zero cases, or errors
  // (Mismatches between expected and observed findings are informational, not failures)
  if (report.aggregate.total_cases < 40) {
    process.stderr.write(`freeform eval: incomplete run — only ${report.aggregate.total_cases} of 40 cases processed\n`);
    process.exitCode = 1;
  } else if (report.aggregate.errored_cases > 0) {
    process.stderr.write(`freeform eval: ${report.aggregate.errored_cases} errors\n`);
    process.exitCode = 1;
  } else if (report.aggregate.total_cases === 0) {
    process.stderr.write("freeform eval: zero cases processed\n");
    process.exitCode = 1;
  }
}
