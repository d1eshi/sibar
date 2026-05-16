import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { isAbsolute, resolve, relative, normalize } from "node:path";

/**
 * Deep Ownership Workspace — runtime contracts, schema, and boundary enforcement.
 *
 * This module provides types that match the deterministic fixture shape
 * and implements validation: evidence identity, role classification,
 * unknown zone detection, boundary enforcement, and out-of-bound rejection.
 */

// ── Evidence ──────────────────────────────────────────────────────────

export type EvidenceRole =
  | "source_truth"
  | "intent"
  | "behavior_oracle"
  | "implementation"
  | "interface"
  | "experiment"
  | "counterexample"
  | "historical_rationale"
  | "unknown";

export const RECOGNIZED_EVIDENCE_ROLES: readonly EvidenceRole[] = [
  "source_truth",
  "intent",
  "behavior_oracle",
  "implementation",
  "interface",
  "experiment",
  "counterexample",
  "historical_rationale",
  "unknown",
];

export type EvidenceSourceType =
  | "source_truth"
  | "intent"
  | "behavior_oracle"
  | "implementation"
  | "interface"
  | "experiment"
  | "counterexample"
  | "historical_rationale";

export type EvidenceStatus = "inspected" | "partial" | "skipped" | "unknown";

export type EvidenceInventoryEntry = {
  id: string;
  path: string;
  source_type: EvidenceSourceType;
  size_bytes: number;
  extension: string;
  role: EvidenceRole;
  content_hash: string;
  excerpt: string;
  status: EvidenceStatus;
  line_count?: number;
};

export type EvidenceRef = {
  evidence_id: string;
  file_path: string;
  start_line: number;
  end_line: number;
  excerpt: string;
  role: EvidenceRole;
};

// ── Skip Records ──────────────────────────────────────────────────────

export type SkipReason =
  | "dependency_directory"
  | "build_output"
  | "version_control"
  | "lockfile"
  | "binary_asset"
  | "generated_asset"
  | "evaluation_infrastructure"
  | "upstream_dependency_outside_slice"
  | "ui_surface_outside_slice"
  | "swift_lens_outside_slice"
  | "out_of_boundary";

export type SkipRisk = "none" | "low" | "medium" | "high";

export type SkipRecord = {
  id: string;
  path: string;
  reason: SkipReason;
  risk_if_ignored: SkipRisk;
};

// ── Unknown Zones ─────────────────────────────────────────────────────

export type UnknownZone = {
  id: string;
  path: string;
  reason: string;
  risk_if_ignored: string;
  when_to_open: string;
};

// ── Artifact Boundary ────────────────────────────────────────────────

export type ArtifactBoundary = {
  root_path: string;
  source_type: "repository" | "folder" | "file_set" | "paper" | "notebook" | "experiment" | "mixed";
  included_sources: string[];
  excluded_sources: string[];
  evidence_roles: EvidenceRole[];
  entrypoints: string[];
  tests_as_oracles: string[];
};

// ── Concept Slice ─────────────────────────────────────────────────────

export type ConceptSlice = {
  id: string;
  label: string;
  domain: "code" | "math" | "paper" | "experiment" | "systems" | "ml" | "rl" | "ui" | "mixed";
  operation_target: UserOperationKind;
  prerequisite_concepts: string[];
  source_evidence: string[];
  behavior_evidence: string[];
  risk_evidence: string[];
  expected_user_operations: UserOperationKind[];
};

// ── User Operation ───────────────────────────────────────────────────

export type UserOperationKind =
  | "explain"
  | "trace"
  | "derive"
  | "predict"
  | "build"
  | "modify"
  | "debug"
  | "transfer"
  | "teach";

export const RECOGNIZED_OPERATION_KINDS: readonly UserOperationKind[] = [
  "explain",
  "trace",
  "derive",
  "predict",
  "build",
  "modify",
  "debug",
  "transfer",
  "teach",
];

export type UserOperation = {
  id: string;
  kind: UserOperationKind;
  prompt: string;
  artifact_ids: string[];
  required_evidence: string[];
  allowed_hints: number;
  blocked_shortcuts: string[];
  success_criteria: string[];
};

// ── Thinking Artifact ────────────────────────────────────────────────

export type ThinkingArtifactKind =
  | "code_slice"
  | "flow_diagram"
  | "architecture_map"
  | "equation_breakdown"
  | "paper_excerpt"
  | "hypothesis_table"
  | "experiment_card"
  | "ablation_plan"
  | "minimal_build"
  | "counterexample"
  | "concept_ladder"
  | "risk_map"
  | "test_oracle"
  | "patch_preview"
  | "memory_review";

export const RECOGNIZED_ARTIFACT_KINDS: readonly ThinkingArtifactKind[] = [
  "code_slice",
  "flow_diagram",
  "architecture_map",
  "equation_breakdown",
  "paper_excerpt",
  "hypothesis_table",
  "experiment_card",
  "ablation_plan",
  "minimal_build",
  "counterexample",
  "concept_ladder",
  "risk_map",
  "test_oracle",
  "patch_preview",
  "memory_review",
];

export type ThinkingArtifact = {
  id: string;
  kind: ThinkingArtifactKind;
  title: string;
  purpose: string;
  concept_slice_id: string;
  source_evidence: EvidenceRef[];
  hidden_solution_evidence: EvidenceRef[];
  user_operation: UserOperation;
  renderer: ThinkingArtifactKind;
  payload: Record<string, unknown>;
  success_criteria: string[];
  created_at: string;
};

// ── Attempt & Evidence Check ──────────────────────────────────────────

export type UserAttempt = {
  id: string;
  operation_id: string;
  answer_text: string;
  selected_evidence: string[];
  declared_confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
  created_at: string;
};

export type EvidenceCheckResult =
  | "confirmed"
  | "partial"
  | "gap"
  | "contradiction"
  | "insufficient_evidence";

export type EvidenceCheck = {
  id: string;
  attempt_id: string;
  required_claims: string[];
  observed_claims: string[];
  missing_claims: string[];
  contradicted_claims: string[];
  unsupported_claims: string[];
  cited_evidence: EvidenceRef[];
  artifact_counterevidence: EvidenceRef[];
  result: EvidenceCheckResult;
};

// ── Gap, Repair, Readiness ───────────────────────────────────────────

export type OwnershipGapKind =
  | "missing_prerequisite"
  | "wrong_causal_model"
  | "shallow_trace"
  | "unsupported_claim"
  | "false_confidence"
  | "formula_misread"
  | "implementation_misread"
  | "behavior_misread"
  | "transfer_failure";

export type OwnershipGap = {
  id: string;
  concept_slice_id: string;
  kind: OwnershipGapKind;
  user_attempt_ref: string;
  artifact_evidence_refs: EvidenceRef[];
  evidence: string;
  severity: "critical" | "important" | "later";
  blocks_readiness: boolean;
  created_at: string;
};

export type RepairAction = {
  id: string;
  gap_id: string;
  operation_kind: UserOperationKind;
  prompt: string;
  required_evidence: EvidenceRef[];
  source_gap_id: string;
  created_at: string;
};

export type ReadinessStatus = "ready" | "limited" | "blocked" | "unknown";

export type ReadinessClaim = {
  id: string;
  concept_slice_id: string;
  operation_id: string;
  status: ReadinessStatus;
  scope: string;
  ready_to_explain: boolean;
  ready_to_trace: boolean;
  ready_to_derive: boolean;
  ready_to_predict: boolean;
  ready_to_build: boolean;
  ready_to_modify: boolean;
  ready_to_debug: boolean;
  ready_to_transfer: boolean;
  ready_to_teach: boolean;
  blocked_claims: string[];
  supporting_evidence: { evidence_id: string }[];
  blocking_gaps: string[];
  confidence: "low" | "medium" | "high";
  generated_at: string;
};

// ── Loop ──────────────────────────────────────────────────────────────

export type LoopState =
  | "GoalInput"
  | "BoundaryProposal"
  | "BoundaryConfirmed"
  | "EvidenceInventoried"
  | "ConceptSliceSelected"
  | "ArtifactGenerated"
  | "AwaitingAttempt"
  | "AttemptStored"
  | "EvidenceChecked"
  | "GapOrReady"
  | "RepairOrReevaluation"
  | "MemoryUpdated";

export type LoopEntry = {
  id: string;
  current_state: LoopState;
  state_chain: LoopState[];
  boundary_enforced: boolean;
  out_of_bound_accesses: number;
};

// ── Deep Ownership Loop (Runtime) ────────────────────────────────────

export type OperationChoice = {
  selected_kind: UserOperationKind;
  rationale: string;
  chosen_at: string;
};

export type WeakGoalRoute = {
  original_goal: string;
  offered_operations: UserOperationKind[];
  chosen_operation: OperationChoice | null;
  requires_choice: boolean;
};

export type DeepOwnershipLoop = {
  id: string;
  goal: string;
  weak_goal_route: WeakGoalRoute | null;
  artifact_boundary: ArtifactBoundary;
  concept_slice: ConceptSlice | null;
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation | null;
  evidence_inventory: EvidenceInventoryEntry[];
  skip_records: SkipRecord[];
  unknown_zones: UnknownZone[];
  sample_attempt: UserAttempt | null;
  evidence_check: EvidenceCheck | null;
  detected_gap: OwnershipGap | null;
  repair_action: RepairAction | null;
  readiness_claim: ReadinessClaim;
  loop_entry: LoopEntry;
};

// ── Workspace Snapshot (UI Projection) ───────────────────────────────

export type WorkspaceSnapshot = {
  snapshot_id: string;
  loop_id: string;
  goal: string;
  weak_goal_route: WeakGoalRoute | null;
  boundary_summary: {
    root_path: string;
    included_count: number;
    excluded_count: number;
  };
  concept_slice: ConceptSlice | null;
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation | null;
  evidence_visible: EvidenceInventoryEntry[];
  unknown_zones: UnknownZone[];
  attempt_stored: boolean;
  attempt_result: {
    answer_text: string;
    declared_confidence: string;
    declared_unknowns: string[];
  } | null;
  evidence_check_result: {
    result: EvidenceCheckResult;
    summary: string;
  } | null;
  detected_gap: {
    kind: OwnershipGapKind;
    severity: string;
    blocks_readiness: boolean;
  } | null;
  repair_action: {
    operation_kind: UserOperationKind;
    prompt: string;
  } | null;
  readiness: {
    status: ReadinessStatus;
    scope: string;
    blocked_claims: string[];
  };
  loop_state: LoopState;
  state_chain: LoopState[];
  has_hidden_solution_content: boolean;
  hidden_solution_gated: boolean;
};

// ── Full Fixture ──────────────────────────────────────────────────────

export type DeepOwnershipFixture = {
  fixture_id: string;
  generated_at: string;
  goal: string;
  artifact_boundary: ArtifactBoundary;
  evidence_inventory: EvidenceInventoryEntry[];
  skip_records: SkipRecord[];
  unknown_zones: UnknownZone[];
  out_of_bound_refs: EvidenceRef[];
  concept_slice: ConceptSlice;
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation;
  sample_attempt: UserAttempt;
  evidence_check: EvidenceCheck;
  detected_gap: OwnershipGap;
  repair_action: RepairAction;
  readiness_claim: ReadinessClaim;
  loop_state: LoopEntry;
};

/**
 * Validate that an EvidenceRef has all required fields: evidence_id, file_path,
 * start_line, end_line, excerpt, and a recognized role.
 */
export function validateEvidenceRef(ref: unknown, context: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!ref || typeof ref !== "object") {
    issues.push(issue(context, "Evidence ref is not an object"));
    return issues;
  }
  const r = ref as Record<string, unknown>;

  if (!r.evidence_id || typeof r.evidence_id !== "string") {
    issues.push(issue(`${context}.evidence_id`, "Missing or invalid evidence_id"));
  }
  if (!r.file_path || typeof r.file_path !== "string") {
    issues.push(issue(`${context}.file_path`, "Missing or invalid file_path"));
  }
  if (typeof r.start_line !== "number" || (r.start_line as number) < 0) {
    issues.push(issue(`${context}.start_line`, "Missing or invalid start_line"));
  }
  if (typeof r.end_line !== "number" || (r.end_line as number) < (r.start_line as number)) {
    issues.push(issue(`${context}.end_line`, "Missing or invalid end_line"));
  }
  if (!r.excerpt || typeof r.excerpt !== "string" || r.excerpt.trim().length === 0) {
    issues.push(issue(`${context}.excerpt`, "Missing or empty excerpt"));
  }
  if (!r.role || !RECOGNIZED_EVIDENCE_ROLES.includes(r.role as EvidenceRole)) {
    issues.push(issue(`${context}.role`, `Unrecognized or missing role '${r.role}'`));
  }
  return issues;
}

// ── Validation ──────────────────────────────────────────────────────

type ValidationIssue = {
  field: string;
  message: string;
  severity: "error" | "warning";
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
  summary: string;
};

function issue(field: string, message: string): ValidationIssue {
  return { field, message, severity: "error" };
}

function warning(field: string, message: string): ValidationIssue {
  return { field, message, severity: "warning" };
}

/**
 * Validate that an evidence ID has the expected stable format.
 */
export function validateEvidenceId(entry: EvidenceInventoryEntry): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (!/^EV-\d{3}$/.test(entry.id)) {
    issues.push(issue("id", `Evidence ID ${entry.id} does not match expected format EV-NNN`));
  }
  return issues;
}

/**
 * Validate that an evidence entry has all required fields and valid role.
 */
export function validateEvidenceEntry(entry: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const e = entry as EvidenceInventoryEntry;
  if (!e || typeof e !== "object") {
    issues.push(issue(`evidence_inventory[${index}]`, "Entry is not an object"));
    return issues;
  }

  if (!e.id || typeof e.id !== "string") {
    issues.push(issue(`evidence_inventory[${index}].id`, "Missing or invalid evidence ID"));
  } else {
    issues.push(...validateEvidenceId(e));
  }

  if (!e.path || typeof e.path !== "string") {
    issues.push(issue(`evidence_inventory[${index}].path`, "Missing or invalid path"));
  }

  if (!e.role || !RECOGNIZED_EVIDENCE_ROLES.includes(e.role)) {
    issues.push(issue(
      `evidence_inventory[${index}].role`,
      `Unrecognized role '${e.role}'. Must be one of: ${RECOGNIZED_EVIDENCE_ROLES.join(", ")}`,
    ));
  }

  if (!e.content_hash || typeof e.content_hash !== "string") {
    issues.push(issue(`evidence_inventory[${index}].content_hash`, "Missing or invalid content_hash"));
  }

  if (!e.source_type || typeof e.source_type !== "string") {
    issues.push(issue(`evidence_inventory[${index}].source_type`, "Missing or invalid source_type"));
  }

  if (typeof e.size_bytes !== "number" || e.size_bytes <= 0) {
    issues.push(issue(`evidence_inventory[${index}].size_bytes`, "Missing or invalid size_bytes"));
  }

  return issues;
}

/**
 * Check whether a path is within the declared artifact boundary.
 */
export function isPathInBoundary(
  candidatePath: string,
  boundary: ArtifactBoundary,
): boolean {
  const normalized = normalize(candidatePath);
  const normalizedRoot = normalize(boundary.root_path);

  for (const included of boundary.included_sources) {
    const resolved = normalize(resolve(normalizedRoot, included));
    if (normalized.startsWith(resolved) || normalized === resolved) {
      return true;
    }
  }

  return false;
}

/**
 * Validate that all evidence inventory paths are within the declared boundary
 * and not in excluded sources.
 */
export function validateBoundaryEnforcement(
  fixture: DeepOwnershipFixture,
  rootPath: string,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const boundary = fixture.artifact_boundary;
  const includedSet = new Set(boundary.included_sources.map((p) => normalize(resolve(rootPath, p))));

  for (const entry of fixture.evidence_inventory) {
    const entryPath = normalize(resolve(rootPath, entry.path));

    // Check if in included sources
    const isIncluded = [...includedSet].some((incPath) =>
      entryPath === incPath || entryPath.startsWith(incPath + "/") || entryPath.startsWith(incPath),
    );

    if (!isIncluded) {
      issues.push(issue(
        `evidence_inventory[${entry.id}]`,
        `Evidence path '${entry.path}' is outside the declared artifact boundary included_sources`,
      ));
    }
  }

  // Check out_of_bound_refs is empty
  if (fixture.out_of_bound_refs && fixture.out_of_bound_refs.length > 0) {
    for (const ref of fixture.out_of_bound_refs) {
      issues.push(issue(
        "out_of_bound_refs",
        `Out-of-bound evidence ref '${ref.evidence_id}' at ${ref.file_path}:${ref.start_line} was not blocked`,
      ));
    }
  }

  // Check no evidence in thinking artifacts references out-of-bound paths
  for (const artifact of fixture.thinking_artifacts) {
    for (const ref of artifact.source_evidence) {
      const refPath = normalize(resolve(rootPath, ref.file_path));
      const refIncluded = [...includedSet].some((incPath) =>
        refPath === incPath || refPath.startsWith(incPath + "/") || refPath.startsWith(incPath),
      );
      if (!refIncluded) {
        issues.push(issue(
          `thinking_artifacts[${artifact.id}].source_evidence`,
          `Evidence ref '${ref.evidence_id}' at ${ref.file_path}:${ref.start_line} is outside the declared boundary`,
        ));
      }
    }
  }

  return issues;
}

/**
 * Validate that skip records have required fields and valid reasons.
 */
export function validateSkipRecord(record: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = record as SkipRecord;
  if (!r || typeof r !== "object") {
    issues.push(issue(`skip_records[${index}]`, "Skip record is not an object"));
    return issues;
  }

  if (!r.id || typeof r.id !== "string") {
    issues.push(issue(`skip_records[${index}].id`, "Missing or invalid skip record ID"));
  }

  if (!r.path || typeof r.path !== "string") {
    issues.push(issue(`skip_records[${index}].path`, "Missing or invalid path in skip record"));
  }

  if (!r.reason || typeof r.reason !== "string") {
    issues.push(issue(`skip_records[${index}].reason`, "Missing or invalid reason in skip record"));
  }

  if (!r.risk_if_ignored || !["none", "low", "medium", "high"].includes(r.risk_if_ignored)) {
    issues.push(issue(`skip_records[${index}].risk_if_ignored`, `Invalid risk_if_ignored '${r.risk_if_ignored}'`));
  }

  return issues;
}

/**
 * Validate that unknown zones have required fields.
 */
export function validateUnknownZone(zone: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const z = zone as UnknownZone;
  if (!z || typeof z !== "object") {
    issues.push(issue(`unknown_zones[${index}]`, "Unknown zone is not an object"));
    return issues;
  }

  if (!z.id || typeof z.id !== "string") {
    issues.push(issue(`unknown_zones[${index}].id`, "Missing or invalid unknown zone ID"));
  }

  if (!z.path || typeof z.path !== "string") {
    issues.push(issue(`unknown_zones[${index}].path`, "Missing or invalid path in unknown zone"));
  }

  if (!z.reason || typeof z.reason !== "string" || z.reason.trim().length === 0) {
    issues.push(issue(`unknown_zones[${index}].reason`, "Missing or empty reason in unknown zone"));
  }

  if (!z.when_to_open || typeof z.when_to_open !== "string" || z.when_to_open.trim().length === 0) {
    issues.push(issue(`unknown_zones[${index}].when_to_open`, "Missing or empty when_to_open in unknown zone"));
  }

  if (!z.risk_if_ignored || typeof z.risk_if_ignored !== "string" || z.risk_if_ignored.trim().length === 0) {
    issues.push(issue(`unknown_zones[${index}].risk_if_ignored`, "Missing or empty risk_if_ignored in unknown zone"));
  }

  return issues;
}

/**
 * Validate the concept slice has operation-bearing structure.
 */
export function validateConceptSlice(slice: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const s = slice as ConceptSlice;
  if (!s || typeof s !== "object") {
    issues.push(issue("concept_slice", "Concept slice is not an object"));
    return issues;
  }

  if (!s.id || typeof s.id !== "string") {
    issues.push(issue("concept_slice.id", "Missing concept slice ID"));
  }

  if (!s.operation_target || !RECOGNIZED_OPERATION_KINDS.includes(s.operation_target)) {
    issues.push(issue("concept_slice.operation_target", `Unrecognized operation_target '${s.operation_target}'`));
  }

  if (!s.source_evidence || s.source_evidence.length === 0) {
    issues.push(issue("concept_slice.source_evidence", "Concept slice must reference source evidence"));
  }

  return issues;
}

/**
 * Validate that a thinking artifact has an operation and source evidence.
 */
export function validateThinkingArtifact(artifact: unknown, index: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const a = artifact as ThinkingArtifact;
  if (!a || typeof a !== "object") {
    issues.push(issue(`thinking_artifacts[${index}]`, "Thinking artifact is not an object"));
    return issues;
  }

  if (!a.id || typeof a.id !== "string") {
    issues.push(issue(`thinking_artifacts[${index}].id`, "Missing artifact ID"));
  }

  if (!a.kind || !RECOGNIZED_ARTIFACT_KINDS.includes(a.kind)) {
    issues.push(issue(`thinking_artifacts[${index}].kind`, `Unrecognized artifact kind '${a.kind}'`));
  }

  if (!a.source_evidence || a.source_evidence.length === 0) {
    issues.push(issue(`thinking_artifacts[${index}].source_evidence`, "Thinking artifact must have source evidence"));
  }

  if (!a.user_operation || !a.user_operation.kind) {
    issues.push(issue(`thinking_artifacts[${index}].user_operation`, "Thinking artifact must have a user operation"));
  }

  if (!a.success_criteria || a.success_criteria.length === 0) {
    issues.push(issue(`thinking_artifacts[${index}].success_criteria`, "Thinking artifact must have success criteria"));
  }

  return issues;
}

/**
 * Validate the readiness claim is scoped and does not claim whole-repo ownership.
 */
export function validateReadinessClaim(claim: unknown): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const r = claim as ReadinessClaim;
  if (!r || typeof r !== "object") {
    issues.push(issue("readiness_claim", "Readiness claim is not an object"));
    return issues;
  }

  if (!r.scope || typeof r.scope !== "string") {
    issues.push(issue("readiness_claim.scope", "Missing scope in readiness claim"));
  } else {
    // Check for whole-repo ownership language
    const wholeRepoPatterns = [
      /understand(s)? this (repo|repository|project|codebase|entire)/i,
      /master(y|ed) this/i,
      /full (repo|repository|project) (ownership|knowledge|mastery)/i,
      /complete understanding of this/i,
    ];
    for (const pattern of wholeRepoPatterns) {
      if (pattern.test(r.scope)) {
        issues.push(issue("readiness_claim.scope", `Scope '${r.scope}' appears to claim whole-repo ownership`));
        break;
      }
    }
  }

  if (r.blocking_gaps && r.blocking_gaps.length > 0 && r.status !== "blocked") {
    issues.push(issue(
      "readiness_claim.status",
      `Readiness has blocking gaps but status is '${r.status}' (should be 'blocked')`,
    ));
  }

  if (r.status === "blocked") {
    const readyFlags = [
      r.ready_to_explain,
      r.ready_to_trace,
      r.ready_to_derive,
      r.ready_to_predict,
      r.ready_to_build,
      r.ready_to_modify,
      r.ready_to_debug,
      r.ready_to_transfer,
      r.ready_to_teach,
    ];
    if (readyFlags.some(Boolean)) {
      issues.push(warning(
        "readiness_claim",
        "Readiness is blocked but some operation readiness flags are true",
      ));
    }
  }

  return issues;
}

/**
 * Comprehensive fixture validation.
 */
export function validateDeepOwnershipFixture(
  fixture: unknown,
  rootPath: string,
): ValidationResult {
  const issues: ValidationIssue[] = [];
  const f = fixture as DeepOwnershipFixture;

  if (!f || typeof f !== "object") {
    return { valid: false, issues: [issue("fixture", "Fixture is not a valid object")], summary: "Invalid fixture" };
  }

  // Goal
  if (!f.goal || typeof f.goal !== "string" || f.goal.trim().length < 10) {
    issues.push(issue("goal", "Fixture must have a concrete goal (minimum 10 characters)"));
  }

  // Weak goal detection
  const weakGoalPatterns = [
    /^(understand|teach|learn|explain|study) (this|the) (repo|repository|project|codebase)[.]?$/i,
    /^teach me/i,
    /^make me (good|better|an expert)/i,
  ];
  if (f.goal) {
    for (const pattern of weakGoalPatterns) {
      if (pattern.test(f.goal.trim())) {
        issues.push(warning("goal", `Goal '${f.goal}' may be too weak. Consider a concrete operation-scoped goal.`));
        break;
      }
    }
  }

  // Boundary
  if (!f.artifact_boundary) {
    issues.push(issue("artifact_boundary", "Missing artifact boundary"));
  } else {
    if (!f.artifact_boundary.root_path) {
      issues.push(issue("artifact_boundary.root_path", "Missing root_path"));
    }
    if (!f.artifact_boundary.included_sources || f.artifact_boundary.included_sources.length === 0) {
      issues.push(issue("artifact_boundary.included_sources", "Boundary must include at least one source"));
    }
  }

  // Evidence inventory
  if (!f.evidence_inventory || !Array.isArray(f.evidence_inventory)) {
    issues.push(issue("evidence_inventory", "Missing evidence inventory"));
  } else if (f.evidence_inventory.length === 0) {
    issues.push(issue("evidence_inventory", "Evidence inventory must have at least one entry"));
  } else {
    for (let i = 0; i < f.evidence_inventory.length; i++) {
      issues.push(...validateEvidenceEntry(f.evidence_inventory[i], i));
    }

    // Check for duplicate IDs
    const ids = f.evidence_inventory.map((e) => e.id);
    const dupes = ids.filter((id, idx) => ids.indexOf(id) !== idx);
    for (const dupeId of [...new Set(dupes)]) {
      issues.push(issue("evidence_inventory", `Duplicate evidence ID: ${dupeId}`));
    }

    // Check for role coverage
    const roles = new Set(f.evidence_inventory.map((e) => e.role));
    if (!roles.has("implementation")) {
      issues.push(warning("evidence_inventory", "No evidence entries have 'implementation' role"));
    }
    if (!roles.has("behavior_oracle")) {
      issues.push(warning("evidence_inventory", "No evidence entries have 'behavior_oracle' role"));
    }
  }

  // Skip records
  if (f.skip_records && Array.isArray(f.skip_records)) {
    for (let i = 0; i < f.skip_records.length; i++) {
      issues.push(...validateSkipRecord(f.skip_records[i], i));
    }
  }

  // Unknown zones
  if (!f.unknown_zones || !Array.isArray(f.unknown_zones)) {
    issues.push(issue("unknown_zones", "Missing unknown zones"));
  } else {
    for (let i = 0; i < f.unknown_zones.length; i++) {
      issues.push(...validateUnknownZone(f.unknown_zones[i], i));
    }
  }

  // Concept slice
  if (!f.concept_slice) {
    issues.push(issue("concept_slice", "Missing concept slice"));
  } else {
    issues.push(...validateConceptSlice(f.concept_slice));
  }

  // Thinking artifacts
  if (!f.thinking_artifacts || !Array.isArray(f.thinking_artifacts)) {
    issues.push(issue("thinking_artifacts", "Missing thinking artifacts"));
  } else if (f.thinking_artifacts.length === 0) {
    issues.push(issue("thinking_artifacts", "Must have at least one thinking artifact"));
  } else {
    for (let i = 0; i < f.thinking_artifacts.length; i++) {
      issues.push(...validateThinkingArtifact(f.thinking_artifacts[i], i));
      // Validate source evidence refs
      const artifact = f.thinking_artifacts[i];
      if (Array.isArray(artifact.source_evidence)) {
        for (let j = 0; j < artifact.source_evidence.length; j++) {
          issues.push(...validateEvidenceRef(artifact.source_evidence[j], `thinking_artifacts[${i}].source_evidence[${j}]`));
        }
      }
      if (Array.isArray(artifact.hidden_solution_evidence)) {
        for (let j = 0; j < artifact.hidden_solution_evidence.length; j++) {
          issues.push(...validateEvidenceRef(artifact.hidden_solution_evidence[j], `thinking_artifacts[${i}].hidden_solution_evidence[${j}]`));
        }
      }
    }
    // Check at least one artifact is operation-bearing
    const hasOperation = f.thinking_artifacts.some(
      (a) => a.user_operation && a.user_operation.kind && a.user_operation.prompt,
    );
    if (!hasOperation) {
      issues.push(issue("thinking_artifacts", "At least one thinking artifact must have an operation-bearing user operation"));
    }
  }

  // Active operation
  if (!f.active_operation) {
    issues.push(issue("active_operation", "Missing active operation"));
  } else if (!f.active_operation.kind || !RECOGNIZED_OPERATION_KINDS.includes(f.active_operation.kind)) {
    issues.push(issue("active_operation.kind", `Unrecognized operation kind '${f.active_operation.kind}'`));
  }

  // Sample attempt
  if (!f.sample_attempt) {
    issues.push(issue("sample_attempt", "Missing sample attempt"));
  } else {
    if (!f.sample_attempt.answer_text || typeof f.sample_attempt.answer_text !== "string") {
      issues.push(issue("sample_attempt.answer_text", "Missing answer text"));
    }
    if (f.sample_attempt.declared_confidence && !["low", "medium", "high"].includes(f.sample_attempt.declared_confidence)) {
      issues.push(issue("sample_attempt.declared_confidence", `Invalid declared_confidence '${f.sample_attempt.declared_confidence}'`));
    }
  }

  // Evidence check
  if (!f.evidence_check) {
    issues.push(issue("evidence_check", "Missing evidence check"));
  } else {
    // Validate nested evidence refs in evidence_check
    const ec = f.evidence_check;
    if (Array.isArray(ec.cited_evidence)) {
      for (let i = 0; i < ec.cited_evidence.length; i++) {
        issues.push(...validateEvidenceRef(ec.cited_evidence[i], `evidence_check.cited_evidence[${i}]`));
      }
    }
    if (Array.isArray(ec.artifact_counterevidence)) {
      for (let i = 0; i < ec.artifact_counterevidence.length; i++) {
        issues.push(...validateEvidenceRef(ec.artifact_counterevidence[i], `evidence_check.artifact_counterevidence[${i}]`));
      }
    }
  }

  // Detected gap
  if (!f.detected_gap) {
    issues.push(issue("detected_gap", "Missing detected gap"));
  } else if (f.detected_gap.severity && !["critical", "important", "later"].includes(f.detected_gap.severity)) {
    issues.push(issue("detected_gap.severity", `Invalid severity '${f.detected_gap.severity}'`));
  }
  if (f.detected_gap && Array.isArray(f.detected_gap.artifact_evidence_refs)) {
    for (let i = 0; i < f.detected_gap.artifact_evidence_refs.length; i++) {
      issues.push(...validateEvidenceRef(f.detected_gap.artifact_evidence_refs[i], `detected_gap.artifact_evidence_refs[${i}]`));
    }
  }

  // Repair action
  if (!f.repair_action) {
    issues.push(issue("repair_action", "Missing repair action"));
  }
  if (f.repair_action && Array.isArray(f.repair_action.required_evidence)) {
    for (let i = 0; i < f.repair_action.required_evidence.length; i++) {
      issues.push(...validateEvidenceRef(f.repair_action.required_evidence[i], `repair_action.required_evidence[${i}]`));
    }
  }

  // Readiness claim
  if (!f.readiness_claim) {
    issues.push(issue("readiness_claim", "Missing readiness claim"));
  } else {
    issues.push(...validateReadinessClaim(f.readiness_claim));
  }

  // Boundary enforcement
  if (f.artifact_boundary) {
    issues.push(...validateBoundaryEnforcement(f, rootPath));
  }

  // Validate out_of_bound_refs as EvidenceRefs
  if (Array.isArray(f.out_of_bound_refs)) {
    for (let i = 0; i < f.out_of_bound_refs.length; i++) {
      issues.push(...validateEvidenceRef(f.out_of_bound_refs[i], `out_of_bound_refs[${i}]`));
    }
  }

  // Loop state
  if (!f.loop_state) {
    issues.push(issue("loop_state", "Missing loop state"));
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return {
    valid: errors.length === 0,
    issues,
    summary: errors.length === 0
      ? `Valid fixture with ${warnings.length} warning(s)`
      : `Invalid fixture with ${errors.length} error(s) and ${warnings.length} warning(s)`,
  };
}

/**
 * Load and validate the deterministic fixture from its expected path.
 */
export function loadAndValidateFixture(fixturePath?: string): {
  fixture: DeepOwnershipFixture | null;
  validation: ValidationResult;
} {
  const path = fixturePath ?? "docs/specs/deep-ownership-workspace/fixtures/sibi-pedagogy-loop.json";
  if (!existsSync(path)) {
    return {
      fixture: null,
      validation: {
        valid: false,
        issues: [issue("fixture", `Fixture file not found at ${path}`)],
        summary: "Fixture file missing",
      },
    };
  }

  let fixture: unknown;
  try {
    fixture = JSON.parse(readFileSync(path, "utf8"));
  } catch (err) {
    return {
      fixture: null,
      validation: {
        valid: false,
        issues: [issue("fixture", `Failed to parse fixture JSON: ${String(err)}`)],
        summary: "Fixture JSON parse error",
      },
    };
  }

  const validation = validateDeepOwnershipFixture(fixture, process.cwd());
  return { fixture: fixture as DeepOwnershipFixture | null, validation };
}

// ── Boundary Enforcement Helpers ──────────────────────────────────────

/**
 * Check whether a given file path escapes the declared artifact boundary
 * via parent-directory traversal, absolute paths outside root, or symlinks.
 */
export function checkBoundaryEscape(
  candidatePath: string,
  rootPath: string,
  boundary: ArtifactBoundary,
): { blocked: boolean; reason?: string } {
  const normalized = normalize(candidatePath);

  // Block absolute paths that escape root
  if (isAbsolute(normalized)) {
    const rooted = normalize(rootPath);
    if (!normalized.startsWith(rooted)) {
      return { blocked: true, reason: `Absolute path '${candidatePath}' escapes declared root '${rootPath}'` };
    }
  }

  // Block .. traversal
  if (normalized.includes("..")) {
    return { blocked: true, reason: `Path '${candidatePath}' contains parent-directory traversal` };
  }

  // Check against excluded sources (strip glob patterns like /** or /*)
  for (const excluded of boundary.excluded_sources) {
    const excludedBase = excluded
      .replace(/\/\*\*(\/.+)?$/, "")
      .replace(/\/\*$/, "")
      .replace(/\/\*\.\w+$/, "");
    const excludedNormalized = normalize(excludedBase);
    const normCandidate = normalize(normalized.replace(/\/\*$/, ""));
    if (normCandidate.startsWith(excludedNormalized + "/") || normCandidate === excludedNormalized) {
      return { blocked: true, reason: `Path '${candidatePath}' matches excluded pattern '${excluded}'` };
    }
  }

  return { blocked: false };
}

// ── Weak Goal Detection ──────────────────────────────────────────────

const WEAK_GOAL_PATTERNS: RegExp[] = [
  /^(understand|teach|learn|explain|study|master)\s+(this|the)\s+(repo|repository|project|codebase)[.]?$/i,
  /^teach me/i,
  /^make me (good|better|an expert)/i,
  /^help me (understand|learn|master|figure out)/i,
  /^(help|explain|understand|teach|learn|study|master)$/i,
];

const WEAK_GOAL_MIN_LENGTH = 10;
const OPERATION_VERB_PATTERN = /\b(trace|derive|predict|build|modify|debug|transfer|teach|explain)\b/i;

/**
 * Detect whether a goal is too weak to start a loop without first resolving
 * to a concrete operation. Returns true when the goal is vague, missing an
 * operation verb, or uses whole-repo teach/explain language.
 *
 * Long (40+ char), specific goals that avoid weak patterns are treated as
 * concrete even when they don't contain a recognized operation verb.
 */
export function detectWeakGoal(goal: string): boolean {
  const trimmed = goal.trim();

  if (trimmed.length < WEAK_GOAL_MIN_LENGTH) return true;

  for (const pattern of WEAK_GOAL_PATTERNS) {
    if (pattern.test(trimmed)) return true;
  }

  // A goal with 40+ characters that doesn't match explicit weak patterns
  // is likely specific and concrete enough to proceed
  if (trimmed.length >= 40) return false;

  // Shorter goals should contain a recognized operation verb
  if (!OPERATION_VERB_PATTERN.test(trimmed)) return true;

  return false;
}

/**
 * Route a weak goal to an operation-choice flow, offering concrete
 * operation kinds the user can select from before the loop starts.
 */
export function routeWeakGoal(goal: string): WeakGoalRoute {
  return {
    original_goal: goal,
    offered_operations: [
      "trace",
      "explain",
      "build",
      "modify",
      "predict",
      "derive",
      "debug",
      "transfer",
      "teach",
    ],
    chosen_operation: null,
    requires_choice: true,
  };
}

// ── Workspace Snapshot Projection ────────────────────────────────────

function isLoopPreAttempt(state: LoopState): boolean {
  const preAttemptStates: LoopState[] = [
    "GoalInput",
    "BoundaryProposal",
    "BoundaryConfirmed",
    "EvidenceInventoried",
    "ConceptSliceSelected",
    "ArtifactGenerated",
    "AwaitingAttempt",
  ];
  return preAttemptStates.includes(state);
}

/**
 * Project a DeepOwnershipLoop into a WorkspaceSnapshot suitable for UI
 * consumption. Pre-attempt, hidden solution content is excluded from
 * thinking artifacts. The snapshot flattens runtime pedagogy state into
 * display-ready fields without leaking internal decision logic.
 */
export function projectWorkspaceSnapshot(loop: DeepOwnershipLoop): WorkspaceSnapshot {
  const preAttempt = isLoopPreAttempt(loop.loop_entry.current_state);

  // Project thinking artifacts: strip hidden_solution_evidence pre-attempt
  const projectedArtifacts: ThinkingArtifact[] = loop.thinking_artifacts.map((artifact) => {
    if (preAttempt) {
      return { ...artifact, hidden_solution_evidence: [] };
    }
    return artifact;
  });

  // Determine hidden solution gating
  const hasHidden = loop.thinking_artifacts.some(
    (a) => a.hidden_solution_evidence.length > 0,
  );

  return {
    snapshot_id: `SNAP-${loop.id}`,
    loop_id: loop.id,
    goal: loop.goal,
    weak_goal_route: loop.weak_goal_route,
    boundary_summary: {
      root_path: loop.artifact_boundary.root_path,
      included_count: loop.artifact_boundary.included_sources.length,
      excluded_count: loop.artifact_boundary.excluded_sources.length,
    },
    concept_slice: loop.concept_slice,
    thinking_artifacts: projectedArtifacts,
    active_operation: loop.active_operation,
    evidence_visible: loop.evidence_inventory,
    unknown_zones: loop.unknown_zones,
    attempt_stored: !preAttempt && loop.sample_attempt !== null,
    attempt_result: loop.sample_attempt
      ? {
          answer_text: loop.sample_attempt.answer_text,
          declared_confidence: loop.sample_attempt.declared_confidence,
          declared_unknowns: loop.sample_attempt.declared_unknowns,
        }
      : null,
    evidence_check_result: loop.evidence_check
      ? {
          result: loop.evidence_check.result,
          summary: `Evidence check ${loop.evidence_check.result}: ${loop.evidence_check.observed_claims.length} observed, ${loop.evidence_check.missing_claims.length} missing`,
        }
      : null,
    detected_gap: loop.detected_gap
      ? {
          kind: loop.detected_gap.kind,
          severity: loop.detected_gap.severity,
          blocks_readiness: loop.detected_gap.blocks_readiness,
        }
      : null,
    repair_action: loop.repair_action
      ? {
          operation_kind: loop.repair_action.operation_kind,
          prompt: loop.repair_action.prompt,
        }
      : null,
    readiness: {
      status: loop.readiness_claim.status,
      scope: loop.readiness_claim.scope,
      blocked_claims: loop.readiness_claim.blocked_claims,
    },
    loop_state: loop.loop_entry.current_state,
    state_chain: loop.loop_entry.state_chain,
    has_hidden_solution_content: hasHidden,
    hidden_solution_gated: preAttempt && hasHidden,
  };
}

/**
 * Convenience: project a WorkspaceSnapshot directly from the serialized
 * fixture without constructing an intermediate DeepOwnershipLoop.
 */
export function projectWorkspaceSnapshotFromFixture(
  fixture: DeepOwnershipFixture,
): WorkspaceSnapshot {
  const loop: DeepOwnershipLoop = {
    id: fixture.loop_state.id,
    goal: fixture.goal,
    weak_goal_route: detectWeakGoal(fixture.goal)
      ? routeWeakGoal(fixture.goal)
      : null,
    artifact_boundary: fixture.artifact_boundary,
    concept_slice: fixture.concept_slice,
    thinking_artifacts: fixture.thinking_artifacts,
    active_operation: fixture.active_operation,
    evidence_inventory: fixture.evidence_inventory,
    skip_records: fixture.skip_records,
    unknown_zones: fixture.unknown_zones,
    sample_attempt: fixture.sample_attempt,
    evidence_check: fixture.evidence_check,
    detected_gap: fixture.detected_gap,
    repair_action: fixture.repair_action,
    readiness_claim: fixture.readiness_claim,
    loop_entry: fixture.loop_state,
  };

  return projectWorkspaceSnapshot(loop);
}
