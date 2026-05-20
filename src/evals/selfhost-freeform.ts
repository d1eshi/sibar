import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

/**
 * Convert a path to repo-relative form, normalizing absolute paths
 * so generated reports are location-independent across checkouts.
 */
function toRepoRelative(filePath: string): string {
  const rel = relative(process.cwd(), resolve(filePath));
  return rel || ".";
}

const DEFAULT_GOLD_CASE_INDEX = "evals/attempt-readiness/gold-cases/index.json";
const DEFAULT_MASTERY_CHECK_DIR = "evals/attempt-readiness/mastery-checks";
const FREEFORM_VALIDATION_ID = "VAL-EVAL-008-selfhost-freeform";
const DEFAULT_SELFHOST_MANIFEST_PATH = "evals/attempt-readiness/manifest.json";
const EXPECTED_CASE_COUNT = 40;

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

const ALL_CONCEPT_IDS = [
  "artifact_boundary",
  "concept_graph_generation",
  "gap_detection",
  "repair_practice_generation",
  "readiness_report_generation",
] as const;

const ALLOWED_READINESS_LABELS = [
  "ready to inspect",
  "ready to explain",
  "ready to modify with guardrails",
  "ready to own",
  "not ready yet",
] as const;

const BENCHMARK_ANSWER_CLASSES = [
  "correct_grounded",
  "correct_uncited",
  "partial",
  "wrong_responsibility",
  "wrong_flow",
  "overconfident_wrong",
  "declared_uncertainty",
  "design_induced_confusion",
] as const;

type FreeformFindingType = "readiness" | (typeof ALL_GAP_LABELS)[number];
type ReadinessLabel = (typeof ALLOWED_READINESS_LABELS)[number];
type IssueCandidateType = "none" | "LearningGap" | "DesignIssue" | "ProductIssue" | "DocsIssue" | "TestIssue";

export type IssueCandidate = {
  id: string;
  type: IssueCandidateType;
  title: string;
  evidence: string[];
  why_it_matters: string;
  proposed_action: string;
  readiness_blocking: boolean;
  linked_to_gap: string | null;
};

export type RepairTaskInfo = {
  description: string;
  required_evidence: string[];
  evidence_producing: boolean;
  generic: boolean;
};

export type ReevaluationInfo = {
  prompt: string;
  preserves_operation: boolean;
  uses_required_evidence: boolean;
  is_repeat_of_original: boolean;
};

type LoopStatus = "not_applicable" | "gap_detected" | "issue_candidate_created" | "repair_task_provided" | "reevaluation_prompted" | "incomplete_loop";

export type LoopSummary = {
  gaps_with_full_loop: number;
  gaps_with_partial_loop: number;
  gaps_failed_closed: number;
  readiness_answers_with_no_candidates: number;
  loop_incomplete_cases: string[];
};

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

type RawSelfhostManifest = {
  included_paths?: unknown;
  excluded_paths?: unknown;
  artifact_id?: unknown;
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
  issue_candidate: IssueCandidate | null;
  issue_candidates: IssueCandidate[];
  user_evidence_excerpt: string;
  repo_evidence_citations: FreeformRepoEvidence[];
  user_evidence_attached: boolean;
  repo_evidence_attached: boolean;
  contradiction_or_insufficiency: string;
  missing_reasoning_step: string;
  repair_task: string | null;
  repair_task_info: RepairTaskInfo | null;
  reevaluation_prompt: string | null;
  reevaluation_info: ReevaluationInfo | null;
  forbidden_claim_triggered: boolean;
  generic_answer_detected: boolean;
  gap_label: string | null;
  loop_status: LoopStatus;
  loop_error: string | null;
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
  issue_candidate_id: string | null;
  user_evidence_attached: boolean;
  repo_evidence_attached: boolean;
  forbidden_claim_triggered: boolean;
  generic_answer_detected: boolean;
  passed: boolean;
  error?: string;
  finding: FreeformEvaluationFinding;
  loop_status: LoopStatus;
  loop_error: string | null;
};

export type SelfhostFreeformReport = {
  generated_at: string;
  validation: string;
  gold_case_index_path: string;
  mismatches: SelfhostFreeformMismatch[];
  manifest_path: string;
  cases: SelfhostFreeformCaseResult[];
  gap_label_coverage: GapLabelCoverage[];
  loop_summary: LoopSummary;
  aggregate: {
    total_cases: number;
    mismatch_count: number;
    passed_cases: number;
    failed_cases: number;
    errored_cases: number;
    user_evidence_attached_cases: number;
    repo_evidence_attached_cases: number;
    forbidden_claim_cases: number;
    generic_answer_cases: number;
    readiness_cases: number;
    gap_cases: number;
    issue_candidate_cases: number;
    full_loop_cases: number;
    incomplete_loop_cases: number;
  };
};

type SelfhostFreeformOptions = {
  indexPath?: string;
  masteryCheckDir?: string;
  reportPath?: string;
  manifestPath?: string;
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

function asBoolean(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function readJsonFile<T>(path: string): T {
  return JSON.parse(readFileSync(path, "utf8")) as T;
}

type SelfhostFreeformMismatch = {
  code: string;
  location: string;
  message: string;
  details?: unknown;
};

const ISSUE_CANDIDATE_TYPES = [
  "none",
  "LearningGap",
  "DesignIssue",
  "ProductIssue",
  "DocsIssue",
  "TestIssue",
] as const;

type IssueCandidateTypeFromManifest = (typeof ISSUE_CANDIDATE_TYPES)[number];

type SelfhostManifestBoundaries = {
  includedPaths: string[];
  excludedPaths: string[];
};

function isGapLabel(value: unknown): value is Exclude<FreeformFindingType, "readiness"> {
  return typeof value === "string" && (ALL_GAP_LABELS as readonly string[]).includes(value);
}

function isReadinessLabel(value: unknown): value is ReadinessLabel {
  return typeof value === "string" && (ALLOWED_READINESS_LABELS as readonly string[]).includes(value);
}

function isIssueCandidateTypeValue(value: unknown): value is IssueCandidateTypeFromManifest {
  return typeof value === "string" && (ISSUE_CANDIDATE_TYPES as readonly string[]).includes(value);
}

function normalizePathForManifest(pathValue: string): string {
  return pathValue.split(sep).join("/");
}

function isPathMatch(pattern: string, candidate: string): boolean {
  const normalizedPattern = normalizePathForManifest(pattern)
    .replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const wildcardPattern = normalizedPattern.replace(/\\\*/g, ".*");
  const regex = new RegExp(`^${wildcardPattern}$`);
  return regex.test(normalizePathForManifest(candidate));
}

function isUnderDirectory(basePath: string, candidatePath: string): boolean {
  const base = normalizePathForManifest(basePath).replace(/\/+$/, "");
  const candidate = normalizePathForManifest(candidatePath).replace(/\/+$/, "");
  return candidate === base || candidate.startsWith(`${base}/`);
}

function isInIncludedPaths(includedPaths: string[], candidatePath: string): boolean {
  const candidate = normalizePathForManifest(candidatePath);
  return includedPaths.some((entry) => {
    const normalizedEntry = normalizePathForManifest(entry).replace(/\/+$/, "");
    return candidate === normalizedEntry || candidate.startsWith(`${normalizedEntry}/`);
  });
}

function isInExcludedPaths(excludedPaths: string[], candidatePath: string): boolean {
  return excludedPaths.some((entry) => {
    const normalizedEntry = normalizePathForManifest(entry);
    const hasWildcard = normalizedEntry.includes("*");
    if (!hasWildcard) {
      return isUnderDirectory(normalizedEntry, candidatePath);
    }

    return isPathMatch(normalizedEntry, candidatePath);
  });
}

function resolveManifestPath(manifestPath: string, entry: string): string {
  if (isAbsolute(entry)) return resolve(entry);
  if (existsSync(resolve(entry))) return resolve(entry);
  return resolve(dirname(manifestPath), entry);
}

function parseManifest(manifestPath: string): SelfhostManifestBoundaries {
  const payload = readJsonFile<RawSelfhostManifest>(manifestPath);
  const includedPaths = asArray(payload.included_paths)
    .map((entry) => asString(entry))
    .filter((entry): entry is string => entry !== null && entry.trim().length > 0)
    .map((entry) => resolveManifestPath(manifestPath, entry))
    .filter((entry) => {
      if (!existsSync(entry)) {
        throw new Error(`manifest_included_path_missing:${entry}`);
      }
      return true;
    });

  const excludedPaths = asArray(payload.excluded_paths)
    .map((entry) => asString(entry))
    .filter((entry): entry is string => entry !== null && entry.trim().length > 0)
    .map((entry) => resolveManifestPath(manifestPath, entry));

  return { includedPaths, excludedPaths };
}

function validateRepoEvidenceAgainstManifest(
  manifest: SelfhostManifestBoundaries,
  evidencePath: string,
): SelfhostFreeformMismatch {
  const normalizedEvidence = resolve(evidencePath);
  if (!existsSync(normalizedEvidence)) {
    return {
      code: "manifest_repo_evidence_missing",
      location: evidencePath,
      message: "required_repo_evidence path does not exist",
      details: { path: normalizedEvidence },
    };
  }

  if (!isInIncludedPaths(manifest.includedPaths, normalizedEvidence)) {
    return {
      code: "repo_evidence_outside_included_paths",
      location: evidencePath,
      message: "required_repo_evidence path is outside manifest included paths",
      details: { path: normalizedEvidence },
    };
  }

  if (isInExcludedPaths(manifest.excludedPaths, normalizedEvidence)) {
    return {
      code: "repo_evidence_in_excluded_path",
      location: evidencePath,
      message: "required_repo_evidence path matches a manifest excluded path",
      details: { path: normalizedEvidence },
    };
  }

  return {
    code: "noop",
    location: evidencePath,
    message: "",
  };
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

function loadRepoEvidence(
  requiredEvidence: RepoEvidenceInput[],
  manifest?: SelfhostManifestBoundaries,
  _caseId?: string,
): FreeformRepoEvidence[] {
  return requiredEvidence.map((entry) => {
    const absolutePath = resolve(entry.path);
    const exists = existsSync(absolutePath);
    const excerpt = exists ? selectRepoExcerpt(readFileSync(absolutePath, "utf8")) : "";

    if (manifest !== undefined) {
      const evidenceMismatch = validateRepoEvidenceAgainstManifest(manifest, absolutePath);
      if (evidenceMismatch.code !== "noop") {
        throw new Error(`${evidenceMismatch.code}:${evidenceMismatch.location}:${JSON.stringify(evidenceMismatch.details)}`);
      }
    }

    if (exists && manifest === undefined) {
      return { ...entry, path: toRepoRelative(entry.path), excerpt, exists };
    }

    if (!exists) {
      throw new Error(`repo_evidence_missing:${absolutePath}`);
    }

    return { ...entry, path: toRepoRelative(entry.path), excerpt, exists };
  });
}

function firstSentence(answer: string): string {
  return answer.split(/(?<=[.!?])\s+/)[0]?.trim() || answer.trim();
}

function answerMentionsRequiredPath(answer: string, evidence: FreeformRepoEvidence[]): boolean {
  const lower = answer.toLowerCase();
  // Check for exact path matches from required evidence
  if (evidence.some((entry) => {
    if (entry.path.length === 0) return false;
    const absolutePath = entry.path.toLowerCase();
    const repoRelativePath = normalizePathForManifest(relative(process.cwd(), entry.path)).toLowerCase();
    return lower.includes(absolutePath) || (repoRelativePath.length > 0 && lower.includes(repoRelativePath));
  })) {
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
    || /(?:i mixed|mixed whether|confus.*order)/i.test(lower)
    || /(?:quality labels first.*then evidence.*end checked|first.*then.*at the end.*not the runtime order|ready first.*then decide.*opposite to runtime|opposite to runtime evaluation order)/i.test(lower);
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
  return /(?:absolutely sure|100%|completely certain|always|every time|no doubt|never wrong|definitely correct|i am sure|i am certain|i know (?:for sure|for certain)|i am confident)/i.test(lower);
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
    if (/\b(?:verified|evidence ids?|summary\.readiness|patch-spec challenge|boundary control|artifact session inventory|persisted graph output)\b/i.test(input.user_answer)) {
      return "ready to modify with guardrails";
    }
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

let issueCandidateCounter = 0;

function issueCandidateTypesFor(findingType: FreeformFindingType, answer: string): IssueCandidateType[] {
  const primary = issueCandidateTypeFor(findingType);
  if (primary === "none") return [];

  const types = new Set<IssueCandidateType>([primary]);
  const lower = answer.toLowerCase();
  const hasLearningEvidence = /(?:i|me|my|user|answer|missed|skipped|forgot|confused|assumed|treated|didn.t|did not|lacked|uncited|no citation)/i.test(lower);
  const hasDocsEvidence = /(?:docs?|documentation|readme|spec|guide|instructions?).*(?:missing|unclear|wrong|stale|confus|hide|doesn.t say|does not say)|(?:missing|unclear|wrong|stale|confus).*(?:docs?|documentation|readme|spec|guide|instructions?)/i.test(lower);
  const hasProductEvidence = /(?:product|ui|ux|affordance|interface|workflow).*(?:missing|unclear|confus|hide|gap|problem)|(?:missing|unclear|confus|hidden).*(?:product|ui|ux|affordance|interface|workflow)/i.test(lower);
  const hasTestEvidence = /(?:test|oracle|assertion|coverage).*(?:missing|unclear|wrong|gap)|(?:missing|unclear|wrong).*(?:test|oracle|assertion|coverage)/i.test(lower);

  if (hasDocsEvidence) types.add("DocsIssue");
  if (hasProductEvidence) types.add("ProductIssue");
  if (hasTestEvidence) types.add("TestIssue");
  if ((hasDocsEvidence || hasProductEvidence || hasTestEvidence) && hasLearningEvidence) types.add("LearningGap");

  return [...types].filter((type) => type !== "none");
}

function buildIssueCandidate(
  findingType: FreeformFindingType,
  conceptId: string,
  evidence: FreeformRepoEvidence[],
  gapLabel: string | null,
  candidateTypeOverride?: IssueCandidateType,
): IssueCandidate | null {
  if (findingType === "readiness") return null;
  issueCandidateCounter += 1;
  const candidateType = candidateTypeOverride ?? issueCandidateTypeFor(findingType);
  const titleMap: Record<string, string> = {
    surface_gap: `${conceptId}: surface-level answer needs deeper evidence`,
    evidence_gap: `${conceptId}: answer lacks concrete file citations`,
    flow_gap: `${conceptId}: answer flow order does not match implementation`,
    boundary_gap: `${conceptId}: answer crosses artifact boundary into excluded scope`,
    responsibility_gap: `${conceptId}: wrong module assigned responsibility`,
    causal_gap: `${conceptId}: missing cause-and-effect reasoning`,
    false_confidence_gap: `${conceptId}: high-confidence claim contradicts evidence`,
    design_induced_gap: `${conceptId}: product terminology makes enforcement unclear`,
    test_oracle_gap: `${conceptId}: answer lacks concrete test assertions`,
    product_gap: `${conceptId}: product affordance gap between docs and code`,
    DocsIssue: `${conceptId}: documentation gap blocks evidence-backed understanding`,
    ProductIssue: `${conceptId}: product affordance gap blocks evidence-backed understanding`,
    TestIssue: `${conceptId}: test oracle gap blocks evidence-backed understanding`,
    LearningGap: `${conceptId}: learner needs evidence-backed repair`,
  };

  const whyMap: Record<string, string> = {
    surface_gap: "Surface-level answers without specific evidence citations cannot demonstrate ownership of the codebase behavior.",
    evidence_gap: "Answers without concrete file path citations cannot be verified against the implementation, making claims unsupported.",
    flow_gap: "When the answer sequence does not match the actual implementation order, the mental model will break during modification or debugging.",
    boundary_gap: "Claims that rely on out-of-boundary evidence create false confidence and violate the artifact scope contract.",
    responsibility_gap: "Assigning a behavior to the wrong module causes downstream errors when modifying or extending the system.",
    causal_gap: "Without cause-and-effect reasoning, the answer cannot predict behavior under change or explain why outcomes occur.",
    false_confidence_gap: "High-confidence claims that contradict evidence create dangerous false certainty about codebase behavior.",
    design_induced_gap: "When product terminology obscures executable enforcement, users treat optional conventions as binding rules.",
    test_oracle_gap: "Without concrete test assertions, answer correctness cannot be objectively verified, leaving claims unvalidated.",
    product_gap: "Product affordance gaps between documentation and code behavior create discoverability failures that block understanding.",
    DocsIssue: "Documentation gaps can prevent users from finding the required repo evidence even when the code behavior exists.",
    ProductIssue: "Product affordance gaps can make the required evidence path hard to discover or apply correctly.",
    TestIssue: "Test oracle gaps leave the expected behavior under-specified and hard to verify.",
    LearningGap: "The learner still needs a narrow evidence-producing repair before readiness can advance.",
  };

  const actionMap: Record<string, string> = {
    surface_gap: "Provide specific file paths and evidence citations that ground the conceptual explanation in the codebase.",
    evidence_gap: "Restate the answer with explicit in-boundary file citations and one allowed/blocked path example from the manifest.",
    flow_gap: "Trace the boundary sequence end-to-end using source file paths and connect each phase to repository evidence.",
    boundary_gap: "Re-ground the answer using only manifest included_paths evidence; exclude paths outside the artifact boundary.",
    responsibility_gap: "Trace the actual implementation to identify which module truly owns the described behavior, citing specific source files.",
    causal_gap: "Explain the cause-and-effect chain: why the observed behavior follows from the cited evidence, not just what happens.",
    false_confidence_gap: "Compare the confidence claim against manifest include/exclude evidence before asserting scope or correctness.",
    design_induced_gap: "Separate product wording confusion from the executable enforcement behavior in the code; clarify which rules are enforced.",
    test_oracle_gap: "Map each expected behavior to a concrete test assertion and explain why that test constrains the implementation.",
    product_gap: "Identify the product affordance gap: what the UI/docs should show versus what the code actually enforces.",
    DocsIssue: "Clarify the documentation so it names the required evidence path and the specific operation being checked.",
    ProductIssue: "Clarify the product affordance so the user can discover and apply the required evidence path.",
    TestIssue: "Add or name the concrete test assertion that would verify the expected behavior.",
    LearningGap: "Ask the learner to restate the answer with required repo evidence and the same operation.",
  };

  return {
    id: `IC-${issueCandidateCounter.toString().padStart(3, "0")}`,
    type: candidateType,
    title: titleMap[candidateType] ?? titleMap[findingType] ?? `${conceptId}: detected ${findingType}`,
    evidence: evidence.map((ev) => `${ev.path}: ${ev.rationale}`),
    why_it_matters: whyMap[candidateType] ?? whyMap[findingType] ?? "This gap blocks readiness because the answer does not demonstrate evidence-backed ownership.",
    proposed_action: actionMap[candidateType] ?? actionMap[findingType] ?? "Re-ground the answer with specific evidence citations and bounded reasoning.",
    readiness_blocking: true,
    linked_to_gap: gapLabel,
  };
}

function buildRepairTaskInfo(
  findingType: FreeformFindingType,
  existingRepairTask: string | null,
  requiredEvidencePaths: string[],
): RepairTaskInfo | null {
  if (findingType === "readiness" || existingRepairTask === null) return null;
  
  // Generic repair detection: repair tasks that are too vague
  const genericPatterns = [
    /^review docs$/i,
    /^read (?:the )?(?:documentation|docs|code)$/i,
    /^think (?:about|more about) it$/i,
    /^try again$/i,
    /^do better$/i,
    /^just review (?:the )?(?:material|content|concept|code)$/i,
  ];
  const isGeneric = genericPatterns.some((pattern) => pattern.test(existingRepairTask.trim()))
    || existingRepairTask.trim().length < 20;

  const evidencePaths = requiredEvidencePaths.length > 0
    ? requiredEvidencePaths
    : ["artifact_boundary_evidence"];

  return {
    description: existingRepairTask,
    required_evidence: evidencePaths,
    evidence_producing: !isGeneric && evidencePaths.length > 0,
    generic: isGeneric,
  };
}

function buildReevaluationInfo(
  findingType: FreeformFindingType,
  reevaluationPrompt: string | null,
  originalPrompt: string,
  operation: string,
): ReevaluationInfo | null {
  if (findingType === "readiness" || reevaluationPrompt === null || reevaluationPrompt.trim().length === 0) return null;

  const trimmedOriginal = originalPrompt.trim();
  const trimmedReeval = reevaluationPrompt.trim();

  // Check if re-evaluation preserves the same operation
  const operationPattern: Record<string, RegExp> = {
    explain: /\b(?:explain|explanation)\b/i,
    trace: /\b(?:trace|tracing)\b/i,
    debug: /\b(?:debug|diagnose|compare expected)\b/i,
    modify: /\b(?:modify|change|state the new)\b/i,
    transfer: /\b(?:transfer|different slice|different concept)\b/i,
    predict: /\b(?:predict|prediction|would change)\b/i,
  };
  const preservesOperation = (operationPattern[operation.toLowerCase()] ?? new RegExp(`\\b${operation}\\b`, "i")).test(trimmedReeval);

  // Check if re-evaluation uses required evidence (mentions paths, evidence, or citations)
  const usesRequiredEvidence = /(?:evidence|path|file|citation|manifest|include|exclude|boundary|src\/|Tests\/|concept graph|rule set|severity|confidence|due_after|readiness|recommended_next_action|`[^`]+`)/i.test(trimmedReeval);

  // Check if re-evaluation is a verbatim repeat
  const isRepeat = trimmedReeval === trimmedOriginal
    || (trimmedReeval.length > 0 && trimmedOriginal.length > 0
        && trimmedReeval.replace(/\s+/g, " ").trim() === trimmedOriginal.replace(/\s+/g, " ").trim());

  return {
    prompt: reevaluationPrompt,
    preserves_operation: preservesOperation,
    uses_required_evidence: usesRequiredEvidence,
    is_repeat_of_original: isRepeat,
  };
}

function determineLoopStatus(
  findingType: FreeformFindingType,
  issueCandidate: IssueCandidate | null,
  repairTaskInfo: RepairTaskInfo | null,
  reevaluationInfo: ReevaluationInfo | null,
): { loop_status: LoopStatus; loop_error: string | null } {
  if (findingType === "readiness") {
    return { loop_status: "not_applicable", loop_error: null };
  }

  // Gap detected but loop artifacts may be incomplete
  const missing: string[] = [];
  if (!issueCandidate) missing.push("issue_candidate");
  if (!repairTaskInfo) missing.push("repair_task");
  if (!reevaluationInfo) missing.push("reevaluation_prompt");

  if (missing.length > 0) {
    return {
      loop_status: "incomplete_loop",
      loop_error: `Incomplete loop: missing ${missing.join(", ")}`,
    };
  }

  // After the check above, repairTaskInfo and reevaluationInfo are non-null
  const repair = repairTaskInfo as RepairTaskInfo;
  const reEval = reevaluationInfo as ReevaluationInfo;

  // Check for generic repair
  if (repair.generic) {
    return {
      loop_status: "incomplete_loop",
      loop_error: "Incomplete loop: repair task is generic and not evidence-producing",
    };
  }

  // Check for repeated re-evaluation
  if (reEval.is_repeat_of_original) {
    return {
      loop_status: "incomplete_loop",
      loop_error: "Incomplete loop: re-evaluation prompt repeats the original prompt verbatim",
    };
  }

  if (!reEval.preserves_operation) {
    return {
      loop_status: "incomplete_loop",
      loop_error: "Incomplete loop: re-evaluation prompt does not preserve the original operation",
    };
  }

  if (!reEval.uses_required_evidence) {
    return {
      loop_status: "incomplete_loop",
      loop_error: "Incomplete loop: re-evaluation prompt does not use required repo evidence",
    };
  }

  // Full loop is present
  return {
    loop_status: "reevaluation_prompted",
    loop_error: null,
  };
}

/**
 * Detect whether a re-evaluation answer is substantially the same as the original failed answer.
 * Uses Jaccard-like word overlap and checks if the same core claims are present.
 */
export function isRepeatedAnswer(originalAnswer: string, newAnswer: string): boolean {
  if (originalAnswer.trim().length === 0 || newAnswer.trim().length === 0) return false;
  if (originalAnswer.trim() === newAnswer.trim()) return true;

  const normalize = (text: string): Set<string> => {
    const words = text.toLowerCase()
      .replace(/[.,;:!?()'"`\-]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length > 3);
    return new Set(words);
  };

  const origWords = normalize(originalAnswer);
  const newWords = normalize(newAnswer);

  if (origWords.size === 0) return false;

  // Count overlap
  let overlap = 0;
  for (const word of newWords) {
    if (origWords.has(word)) overlap += 1;
  }

  const overlapRatio = overlap / origWords.size;
  // If >70% of original significant words appear in new answer, it's a repeat
  return overlapRatio > 0.7;
}

/**
 * Simulate re-evaluation: given the original gap finding and a new user answer,
 * determine whether the gap is repaired and readiness can advance.
 * Returns updated readiness and whether the re-evaluation succeeded.
 */
export type ReevaluationResult = {
  gap_repaired: boolean;
  updated_readiness: ReadinessLabel;
  repeated_answer: boolean;
  repair_evidence_cited: boolean;
  loop_error: string | null;
};

export function simulateReevaluation(
  originalFinding: FreeformEvaluationFinding,
  newAnswer: string,
  newConfidence: string | undefined,
): ReevaluationResult {
  if (originalFinding.gap_present === false || originalFinding.finding_type === "readiness") {
    return {
      gap_repaired: true,
      updated_readiness: originalFinding.readiness,
      repeated_answer: false,
      repair_evidence_cited: true,
      loop_error: null,
    };
  }

  // Check if the answer is a repeat
  const isRepeat = isRepeatedAnswer(originalFinding.user_evidence_excerpt, newAnswer);

  if (isRepeat) {
    return {
      gap_repaired: false,
      updated_readiness: "not ready yet",
      repeated_answer: true,
      repair_evidence_cited: false,
      loop_error: "Re-evaluation failed: answer repeats the original failed answer without new evidence.",
    };
  }

  // Check if the new answer cites evidence (paths, references)
  const hasEvidenceCitation = /(?:src\/|Tests\/|docs\/|[`\"'][^`\"']*\.[^`\"']{1,6}[`\"'])/.test(newAnswer)
    || newAnswer.length > 100;

  if (!hasEvidenceCitation) {
    return {
      gap_repaired: false,
      updated_readiness: "not ready yet",
      repeated_answer: false,
      repair_evidence_cited: false,
      loop_error: "Re-evaluation failed: new answer does not cite in-boundary evidence.",
    };
  }

  // Check for uncertainty declarations
  const hasUncertainty = /(?:i am not (?:fully |yet |really |quite )?sure|i cannot (?:confidently|fully|give|map|confirm)|i am unsure|i don.t know|uncertain|not certain|not confident)/i.test(newAnswer);

  if (hasUncertainty) {
    return {
      gap_repaired: false,
      updated_readiness: "not ready yet",
      repeated_answer: false,
      repair_evidence_cited: true,
      loop_error: "Re-evaluation failed: answer declares uncertainty rather than demonstrating understanding.",
    };
  }

  // Successful re-evaluation: advance readiness (bounded)
  const boundedReadiness = originalFinding.issue_candidate
    ? "ready to explain"
    : "ready to inspect";

  return {
    gap_repaired: true,
    updated_readiness: boundedReadiness,
    repeated_answer: false,
    repair_evidence_cited: true,
    loop_error: null,
  };
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
    if (lower.includes("expected_layer") || lower.includes("observed_layer")) {
      findingType = "flow_gap";
    } else if (lower.includes("but i missed") || lower.includes("however i") || lower.includes("i cannot fully")
        || lower.includes("not complete") || lower.includes("i skipped") || lower.includes("but i skipped")
        || lower.includes("did not show") || lower.includes("missed that") || lower.includes("i missed")) {
      findingType = "causal_gap";
    } else if (/\b(?:verified|evidence ids?|summary\.readiness|patch-spec challenge|boundary control|artifact session inventory|persisted graph output)\b/i.test(answer)) {
      findingType = "readiness";
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

  const issueCandidateTypes = issueCandidateTypesFor(findingType, answer);
  const issueCandidates = issueCandidateTypes
    .map((type) => buildIssueCandidate(findingType, input.masteryCheck.concept_id, repoEvidence, gapPresent ? findingType : null, type))
    .filter((candidate): candidate is IssueCandidate => candidate !== null);
  const issueCandidate = issueCandidates[0] ?? null;
  const issueCandidateType = issueCandidate?.type ?? "none";
  const repairTask = repairTaskFor(findingType);
  const repairTaskInfo = buildRepairTaskInfo(findingType, repairTask, input.masteryCheck.required_repo_evidence.map((ev) => ev.path));
  const reevalPromptString = gapPresent ? input.masteryCheck.reevaluation_prompt : null;
  const reevaluationInfo = buildReevaluationInfo(findingType, reevalPromptString, input.masteryCheck.prompt, input.masteryCheck.operation);
  const loopResult = determineLoopStatus(findingType, issueCandidate, repairTaskInfo, reevaluationInfo);

  return {
    finding_type: findingType,
    gap_present: gapPresent,
    concept_id: input.masteryCheck.concept_id,
    operation: input.masteryCheck.operation,
    readiness: readinessFor(findingType, input),
    issue_candidate_type: issueCandidateType,
    issue_candidate: issueCandidate,
    issue_candidates: issueCandidates,
    user_evidence_excerpt: firstSentence(answer),
    repo_evidence_citations: repoEvidence,
    user_evidence_attached: hasUserEvidence,
    repo_evidence_attached: hasRepoEvidence,
    contradiction_or_insufficiency: insufficiencyFor(findingType),
    missing_reasoning_step: missingStepFor(findingType),
    repair_task: repairTask,
    repair_task_info: repairTaskInfo,
    reevaluation_prompt: reevalPromptString,
    reevaluation_info: reevaluationInfo,
    forbidden_claim_triggered: forbiddenClaim !== null,
    generic_answer_detected: isGeneric,
    gap_label: gapPresent ? findingType : null,
    loop_status: loopResult.loop_status,
    loop_error: loopResult.loop_error,
  };
}

type ResolvedExpectedCaseMeta = {
  expectedFindingType: FreeformFindingType;
  expectedIssueCandidateType: IssueCandidateType;
  expectedReadiness: ReadinessLabel;
};

function resolveExpectedCaseMeta(caseId: string, casePayload: RawGoldCase): ResolvedExpectedCaseMeta {
  const expectedGapPresent = asBoolean(casePayload.expected_gap_present);
  if (expectedGapPresent === null) {
    throw new Error(`invalid_case_expected_gap_present:${caseId}`);
  }

  const expectedReadiness = isReadinessLabel(asString(casePayload.expected_readiness))
    ? asString(casePayload.expected_readiness) as ReadinessLabel
    : null;

  if (expectedGapPresent === false) {
    const expectedGapType = asString(casePayload.expected_gap_type);
    if (expectedGapType !== null && expectedGapType !== "readiness" && expectedGapType !== "null") {
      throw new Error(`invalid_case_expected_gap_type_when_ready:${caseId}`);
    }
    if (expectedReadiness === null) {
      throw new Error(`invalid_case_expected_readiness_when_ready:${caseId}`);
    }
    const expectedIssueType = asString(casePayload.acceptable_issue_candidate_type);
    if (expectedIssueType !== "none") {
      throw new Error(`invalid_case_issue_candidate_when_ready:${caseId}`);
    }
    return {
      expectedFindingType: "readiness",
      expectedIssueCandidateType: "none",
      expectedReadiness,
    };
  }

  const expectedGapType = asString(casePayload.expected_gap_type);
  if (!isGapLabel(expectedGapType)) {
    throw new Error(`invalid_case_expected_gap_type:${caseId}`);
  }

  const expectedIssueCandidateType = asString(casePayload.acceptable_issue_candidate_type);
  if (!isIssueCandidateTypeValue(expectedIssueCandidateType) || expectedIssueCandidateType === "none") {
    throw new Error(`invalid_case_acceptable_issue_candidate_type:${caseId}`);
  }

  if (expectedReadiness === null) {
    throw new Error(`invalid_case_expected_readiness_when_gap:${caseId}`);
  }

  return {
    expectedFindingType: expectedGapType,
    expectedIssueCandidateType,
    expectedReadiness,
  };
}

function isExpectedConceptID(value: string | null): value is (typeof ALL_CONCEPT_IDS)[number] {
  return value !== null && (ALL_CONCEPT_IDS as readonly string[]).includes(value);
}

function isExpectedAnswerClass(value: string | null): value is (typeof BENCHMARK_ANSWER_CLASSES)[number] {
  return value !== null && (BENCHMARK_ANSWER_CLASSES as readonly string[]).includes(value);
}

function recordCaseMismatch(
  mismatches: SelfhostFreeformMismatch[],
  code: string,
  location: string,
  message: string,
  details?: unknown,
) {
  mismatches.push({
    code,
    location,
    message,
    details,
  });
}

function makeEmptyReport(
  options: SelfhostFreeformOptions,
  mismatches: SelfhostFreeformMismatch[],
  manifestPath: string,
): SelfhostFreeformReport {
  const report: SelfhostFreeformReport = {
    generated_at: new Date().toISOString(),
    validation: FREEFORM_VALIDATION_ID,
    gold_case_index_path: toRepoRelative(options.indexPath ?? DEFAULT_GOLD_CASE_INDEX),
    manifest_path: toRepoRelative(manifestPath),
    mismatches,
    cases: [],
    gap_label_coverage: ALL_GAP_LABELS.map((label) => ({
      label,
      represented: false,
      case_count: 0,
      case_ids: [],
    })),
    loop_summary: {
      gaps_with_full_loop: 0,
      gaps_with_partial_loop: 0,
      gaps_failed_closed: 0,
      readiness_answers_with_no_candidates: 0,
      loop_incomplete_cases: [],
    },
    aggregate: {
      total_cases: 0,
      mismatch_count: mismatches.length,
      passed_cases: 0,
      failed_cases: 0,
      errored_cases: 0,
      user_evidence_attached_cases: 0,
      repo_evidence_attached_cases: 0,
      forbidden_claim_cases: 0,
      generic_answer_cases: 0,
      readiness_cases: 0,
      gap_cases: 0,
      issue_candidate_cases: 0,
      full_loop_cases: 0,
      incomplete_loop_cases: 0,
    },
  };

  if (options.reportPath) {
    const reportPath = resolve(options.reportPath);
    mkdirSync(dirname(reportPath), { recursive: true });
    writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  return report;
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
  const manifestPath = resolve(options.manifestPath ?? DEFAULT_SELFHOST_MANIFEST_PATH);
  const mismatches: SelfhostFreeformMismatch[] = [];
  let manifestBoundaries: { includedPaths: string[]; excludedPaths: string[] };

  try {
    manifestBoundaries = parseManifest(manifestPath);
  } catch (err) {
    return makeEmptyReport(options, [{
      code: "manifest_parse_failed",
      location: manifestPath,
      message: `failed to parse or validate manifest`,
      details: (err as Error).message,
    }], manifestPath);
  }

  let indexPayload: RawCaseIndex;
  try {
    indexPayload = readJsonFile<RawCaseIndex>(goldCaseIndexPath);
  } catch (err) {
    return makeEmptyReport(options, [{
      code: "index_parse_failed",
      location: goldCaseIndexPath,
      message: "failed to parse index payload",
      details: (err as Error).message,
    }], manifestPath);
  }

  const caseEntries = asArray(indexPayload.cases)
    .map((entry) => asObject(entry) as RawCaseEntry | null)
    .filter((entry): entry is RawCaseEntry => entry !== null);
  if (caseEntries.length === 0) {
    return makeEmptyReport(options, [{
      code: "index_empty",
      location: goldCaseIndexPath,
      message: "no cases defined in index",
    }], manifestPath);
  }

  const caseIdCounts = new Map<string, number>();
  const casePathCounts = new Map<string, number>();
  const expectedCombinationCounts = new Map<string, number>();
  for (const conceptId of ALL_CONCEPT_IDS) {
    for (const answerClass of BENCHMARK_ANSWER_CLASSES) {
      expectedCombinationCounts.set(`${conceptId}::${answerClass}`, 0);
    }
  }

  const gapLabelCaseMap = new Map<string, { expected: string[]; observed: string[] }>();
  for (const label of ALL_GAP_LABELS) {
    gapLabelCaseMap.set(label, { expected: [], observed: [] });
  }

  const cases: SelfhostFreeformCaseResult[] = [];
  let erroredCases = 0;
  let mismatchCount = 0;
  const observedCaseIds = new Set<string>();

  for (const entry of caseEntries) {
    const caseId = asString(entry.id) ?? "unknown";
    const relativeCasePath = asString(entry.path) ?? "";
    const answerClass = asString(entry.answer_class);
    const resolvedCaseId = caseId.trim();
    const resolvedCasePath = resolve(dirname(goldCaseIndexPath), relativeCasePath.trim());

    if (!/^GC-\d{3}$/.test(resolvedCaseId)) {
      recordCaseMismatch(mismatches, "invalid_case_id", resolvedCasePath, "case id must match GC-###", { caseId });
      mismatchCount += 1;
      continue;
    }

    if (caseIdCounts.has(resolvedCaseId)) {
      recordCaseMismatch(mismatches, "duplicate_case_id", resolvedCaseId, "duplicate case id detected", { caseId });
      mismatchCount += 1;
    } else {
      caseIdCounts.set(resolvedCaseId, 1);
    }

    if (!relativeCasePath || !relativeCasePath.trim()) {
      recordCaseMismatch(mismatches, "invalid_case_path", resolvedCaseId, "case path missing", { casePath: relativeCasePath });
      mismatchCount += 1;
      continue;
    }

    casePathCounts.set(resolvedCasePath, (casePathCounts.get(resolvedCasePath) ?? 0) + 1);
    if (casePathCounts.get(resolvedCasePath)! > 1) {
      recordCaseMismatch(mismatches, "duplicate_case_path", resolvedCaseId, "duplicate case path detected", { path: resolvedCasePath });
      mismatchCount += 1;
    }

    if (observedCaseIds.has(resolvedCaseId)) {
      continue;
    }
    observedCaseIds.add(resolvedCaseId);

    try {
      const casePayload = readJsonFile<RawGoldCase>(resolve(dirname(goldCaseIndexPath), relativeCasePath));
      const masteryCheckID = asString(casePayload.mastery_check_id) ?? asString(entry.mastery_check_id) ?? "";
      if (!masteryCheckID) {
        throw new Error(`invalid_mastery_check_id`);
      }
      const masteryCheck = loadMasteryCheck(masteryCheckDir, masteryCheckID);
      const boundedEvidence = loadRepoEvidence(masteryCheck.required_repo_evidence, manifestBoundaries);
      const finding = evaluateFreeformOwnershipAnswer({
        masteryCheck,
        user_answer: asString(casePayload.simulated_user_answer) ?? "",
        declared_confidence: asString(casePayload.declared_confidence) ?? undefined,
        answer_class: answerClass ?? undefined,
        bounded_repo_evidence: boundedEvidence,
      });

      const expectedMeta = resolveExpectedCaseMeta(resolvedCaseId, casePayload);
      const expectedCaseConceptId = asString(casePayload.concept_id) ?? asString(entry.concept_id) ?? "";
      const expectedCaseAnswerClass = asString(casePayload.answer_class) ?? asString(entry.answer_class) ?? null;
      const isConceptValid = isExpectedConceptID(expectedCaseConceptId);
      const isAnswerClassValid = isExpectedAnswerClass(expectedCaseAnswerClass);

      if (!isConceptValid) {
        throw new Error(`invalid_concept_id:${expectedCaseConceptId || "<missing>"}`);
      }
      if (!isAnswerClassValid) {
        throw new Error(`invalid_answer_class:${expectedCaseAnswerClass || "<missing>"}`);
      }
      if (expectedCaseAnswerClass !== null) {
        const comboKey = `${expectedCaseConceptId}::${expectedCaseAnswerClass}`;
        expectedCombinationCounts.set(comboKey, (expectedCombinationCounts.get(comboKey) ?? 0) + 1);
      }

      // Track gap label coverage
      const expectedGapType = expectedMeta.expectedFindingType;
      if (expectedGapType !== "readiness") {
        const entry = gapLabelCaseMap.get(expectedGapType);
        if (entry) entry.expected.push(caseId);
      }
      if (finding.gap_label) {
        const entry = gapLabelCaseMap.get(finding.gap_label);
        if (entry) entry.observed.push(caseId);
      }

      const caseMismatches: SelfhostFreeformMismatch[] = [];
      if (finding.finding_type !== expectedMeta.expectedFindingType) {
        caseMismatches.push({
          code: "finding_type_mismatch",
          location: resolvedCaseId,
          message: "observed finding type does not match expected",
          details: {
            expected: expectedMeta.expectedFindingType,
            observed: finding.finding_type,
          },
        });
      }

      if (finding.readiness !== expectedMeta.expectedReadiness) {
        caseMismatches.push({
          code: "readiness_label_mismatch",
          location: resolvedCaseId,
          message: "observed readiness label does not match expected",
          details: {
            expected: expectedMeta.expectedReadiness,
            observed: finding.readiness,
          },
        });
      }

      if (finding.issue_candidate_type !== expectedMeta.expectedIssueCandidateType) {
        caseMismatches.push({
          code: "issue_candidate_type_mismatch",
          location: resolvedCaseId,
          message: "observed issue candidate type does not match expected",
          details: {
            expected: expectedMeta.expectedIssueCandidateType,
            observed: finding.issue_candidate_type,
          },
        });
      }

      if (caseMismatches.length > 0) {
        mismatches.push(...caseMismatches);
        mismatchCount += caseMismatches.length;
      }

      const passed = caseMismatches.length === 0
        && finding.user_evidence_attached
        && finding.repo_evidence_attached
        && !finding.generic_answer_detected;

      cases.push({
        case_id: caseId,
        mastery_check_id: masteryCheckID,
        concept_id: expectedCaseConceptId,
        answer_class: answerClass,
        expected_finding_type: expectedMeta.expectedFindingType,
        observed_finding_type: finding.finding_type,
        expected_issue_candidate_type: expectedMeta.expectedIssueCandidateType,
        observed_issue_candidate_type: finding.issue_candidate_type,
        issue_candidate_id: finding.issue_candidate?.id ?? null,
        user_evidence_attached: finding.user_evidence_attached,
        repo_evidence_attached: finding.repo_evidence_attached,
        forbidden_claim_triggered: finding.forbidden_claim_triggered,
        generic_answer_detected: finding.generic_answer_detected,
        passed,
        finding,
        loop_status: finding.loop_status,
        loop_error: finding.loop_error,
      });
    } catch (err) {
      erroredCases += 1;
      const message = (err as Error).message;
      const boundaryCode = message.startsWith("repo_evidence_outside_included_paths:")
        ? "repo_evidence_outside_included_paths"
        : message.startsWith("repo_evidence_in_excluded_path:")
          ? "repo_evidence_in_excluded_path"
          : message.startsWith("manifest_repo_evidence_missing:")
            ? "manifest_repo_evidence_missing"
            : null;
      recordCaseMismatch(mismatches, boundaryCode ?? "case_evaluation_error", resolvedCaseId, message, { casePath: resolvedCasePath });
      mismatchCount += 1;
      cases.push({
        case_id: caseId,
        mastery_check_id: asString(entry.mastery_check_id) ?? "",
        concept_id: asString(entry.concept_id) ?? "",
        answer_class: answerClass,
        expected_finding_type: "readiness",
        observed_finding_type: "evidence_gap",
        expected_issue_candidate_type: "none",
        observed_issue_candidate_type: "LearningGap",
        issue_candidate_id: null,
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
          issue_candidate: null,
          issue_candidates: [],
          user_evidence_excerpt: "",
          repo_evidence_citations: [],
          user_evidence_attached: false,
          repo_evidence_attached: false,
          contradiction_or_insufficiency: "Evaluation error prevented classification.",
          missing_reasoning_step: "Fix the error condition and re-run.",
          repair_task: null,
          repair_task_info: null,
          reevaluation_prompt: null,
          reevaluation_info: null,
          forbidden_claim_triggered: false,
          generic_answer_detected: false,
          gap_label: null,
          loop_status: "incomplete_loop",
          loop_error: "Evaluation error prevented loop artifacts.",
        },
        loop_status: "incomplete_loop",
        loop_error: "Evaluation error prevented loop artifacts.",
      });
    }
  }

  const totalCases = cases.length;
  const expectedCaseCount = EXPECTED_CASE_COUNT;
  if (totalCases !== expectedCaseCount) {
    recordCaseMismatch(mismatches, "case_count_mismatch", goldCaseIndexPath, "unexpected case count", {
      expected: expectedCaseCount,
      observed: totalCases,
    });
    mismatchCount += 1;
  }

  const unexpectedCaseCount = caseIdCounts.size - expectedCaseCount;
  if (unexpectedCaseCount > 0) {
    recordCaseMismatch(mismatches, "extra_cases", goldCaseIndexPath, "extra cases beyond expected", {
      expected: expectedCaseCount,
      observed: caseIdCounts.size,
    });
    mismatchCount += 1;
  }

  if (caseIdCounts.size < expectedCaseCount) {
    recordCaseMismatch(mismatches, "missing_cases", goldCaseIndexPath, "missing expected number of cases", {
      expected: expectedCaseCount,
      observed: caseIdCounts.size,
    });
    mismatchCount += 1;
  }

  for (const [comboKey, count] of expectedCombinationCounts.entries()) {
    if (count !== 1) {
      const [conceptId, answerClass] = comboKey.split("::");
      recordCaseMismatch(mismatches, count === 0 ? "missing_case_coverage" : "duplicate_case_coverage", comboKey, "concept-answer coverage is not exactly one", {
        concept_id: conceptId,
        answer_class: answerClass,
        observed: count,
      });
      mismatchCount += 1;
    }
  }

  if (!caseEntries.every((entry) => /^GC-\d{3}$/.test(asString(entry.id) ?? ""))) {
    recordCaseMismatch(mismatches, "invalid_case_id_format", goldCaseIndexPath, "index contains non-standard case ids");
    mismatchCount += 1;
  }

  for (const [caseId, count] of caseIdCounts.entries()) {
    if (count !== 1) {
      recordCaseMismatch(mismatches, "case_id_coverage", caseId, "case id count is not exactly one", { count });
      mismatchCount += 1;
    }
  }

  for (const [casePath, count] of casePathCounts.entries()) {
    if (count !== 1) {
      recordCaseMismatch(mismatches, "case_path_coverage", casePath, "case path count is not exactly one", { count });
      mismatchCount += 1;
    }
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

  const loopSummary: LoopSummary = {
    gaps_with_full_loop: cases.filter((c) => c.loop_status === "reevaluation_prompted").length,
    gaps_with_partial_loop: cases.filter((c) => c.loop_status === "gap_detected" || c.loop_status === "issue_candidate_created" || c.loop_status === "repair_task_provided").length,
    gaps_failed_closed: cases.filter((c) => c.loop_status === "incomplete_loop").length,
    readiness_answers_with_no_candidates: cases.filter((c) => c.observed_finding_type === "readiness" && c.issue_candidate_id === null).length,
    loop_incomplete_cases: cases.filter((c) => c.loop_status === "incomplete_loop").map((c) => c.case_id),
  };

  const report: SelfhostFreeformReport = {
    generated_at: new Date().toISOString(),
    validation: FREEFORM_VALIDATION_ID,
    gold_case_index_path: toRepoRelative(goldCaseIndexPath),
    manifest_path: toRepoRelative(manifestPath),
    mismatches,
    cases,
    gap_label_coverage: gapLabelCoverage,
    loop_summary: loopSummary,
    aggregate: {
      total_cases: totalCases,
      mismatch_count: mismatches.length,
      passed_cases: cases.filter((entry) => entry.passed).length,
      failed_cases: cases.filter((entry) => !entry.passed && !entry.error).length,
      errored_cases: erroredCases,
      user_evidence_attached_cases: cases.filter((entry) => entry.user_evidence_attached).length,
      repo_evidence_attached_cases: cases.filter((entry) => entry.repo_evidence_attached).length,
      forbidden_claim_cases: cases.filter((entry) => entry.forbidden_claim_triggered).length,
      generic_answer_cases: cases.filter((entry) => entry.generic_answer_detected).length,
      readiness_cases: cases.filter((entry) => entry.observed_finding_type === "readiness").length,
      gap_cases: cases.filter((entry) => entry.observed_finding_type !== "readiness").length,
      issue_candidate_cases: cases.filter((entry) => entry.issue_candidate_id !== null).length,
      full_loop_cases: cases.filter((entry) => entry.loop_status === "reevaluation_prompted").length,
      incomplete_loop_cases: cases.filter((entry) => entry.loop_status === "incomplete_loop").length,
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
  const manifestArg = getFlagValue(process.argv, "manifest");
  const report = runSelfhostFreeformEval({
    indexPath: indexArg,
    manifestPath: manifestArg,
    reportPath: reportArg,
  });

  process.stdout.write(`${JSON.stringify(report.aggregate, null, 2)}\n`);

  // Fail closed: exit nonzero for incomplete runs, mismatches, errors, or incomplete loops
  if (report.aggregate.total_cases !== EXPECTED_CASE_COUNT) {
    const coverageState = report.aggregate.total_cases === 0 ? "zero cases" : "incomplete case coverage";
    process.stderr.write(`freeform eval: ${coverageState}; expected ${EXPECTED_CASE_COUNT} cases but observed ${report.aggregate.total_cases}\n`);
    process.exitCode = 1;
  } else if (report.aggregate.mismatch_count > 0) {
    process.stderr.write(`freeform eval: ${report.aggregate.mismatch_count} mismatches detected\n`);
    process.exitCode = 1;
  } else if (report.aggregate.errored_cases > 0) {
    process.stderr.write(`freeform eval: ${report.aggregate.errored_cases} errored case evaluations\n`);
    process.exitCode = 1;
  } else if (report.aggregate.incomplete_loop_cases > 0) {
    process.stderr.write(`freeform eval: ${report.aggregate.incomplete_loop_cases} cases with incomplete repair loops\n`);
    process.exitCode = 1;
  }
}
