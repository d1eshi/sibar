import { basename, isAbsolute, join, relative, sep } from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { existsSync, readFileSync, statSync } from "node:fs";

import {
  detectWeakGoal,
  routeWeakGoal,
} from "./runtime-deep-ownership-snapshot.ts";
import type {
  DeepOwnershipLoop,
  EvidenceCheck,
  OwnershipGap,
  ReadinessClaim,
  RepairAction,
  UserAttempt,
} from "./runtime-deep-ownership-loop-types.ts";
import type {
  EvidenceRef,
  EvidenceInventoryEntry,
  ThinkingArtifact,
  UserOperation,
} from "./runtime-deep-ownership-evidence-types.ts";
import type {
  ArtifactSession,
  EvidenceCitation,
  ModelSignalCandidate,
} from "./runtime-support.ts";
import type { WorkspaceInventory } from "./runtime-workspace-context.ts";
import type { ProjectLearningAgentResult } from "./runtime-agent.ts";
import { now } from "./runtime-support.ts";
import {
  MAX_CONCEPT_SLICE_LABEL_LENGTH,
  MAX_OPERATION_CRITERIA,
  MAX_OPERATION_EVIDENCE,
} from "./runtime-workspace-session-constants.ts";

export type WorkspaceRunnerSummary = {
  status: "completed" | "blocked";
  blocked_reason?: string;
  model_runner?: string;
  model_name?: string;
  reasoning_effort?: string;
  accepted_signal_count: number;
  rejected_signal_count: number;
};

type ReadinessClaimInput = {
  conceptSliceID: string;
  operationID: string;
  status: ReadinessClaim["status"];
  scope: string;
  blockedClaims: string[];
  supportingEvidence: string[];
  blockingGaps: string[];
};

function hashText(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 16);
}

export function asStringArray(value: unknown, fallback: string[]): string[] {
  return Array.isArray(value) ? value.map((entry) => String(entry)) : fallback;
}

export function resolveDefaultExcludedPaths(rootPath: string, fallbackPaths: string[]): string[] {
  return fallbackPaths.filter((entry) => existsSync(join(rootPath, entry)));
}

export function resolveWorkspaceURL(payload: Record<string, unknown>, defaultURL: string): string {
  return typeof payload.workspace_url === "string" && payload.workspace_url.trim().length > 0
    ? payload.workspace_url.trim()
    : defaultURL;
}

function relativeRepoPath(rootPath: string, absolutePath: string): string {
  return relative(rootPath, absolutePath).split(sep).join("/") || basename(absolutePath);
}

function resolveEvidenceSourcePath(artifactSession: ArtifactSession, citationPath: string): string {
  return isAbsolute(citationPath) ? citationPath : join(artifactSession.root_path, citationPath);
}

export function makeReadinessClaim(input: ReadinessClaimInput): ReadinessClaim {
  return {
    id: `READY-${randomUUID().slice(0, 8)}`,
    concept_slice_id: input.conceptSliceID,
    operation_id: input.operationID,
    status: input.status,
    scope: input.scope,
    ready_to_explain: input.status === "ready",
    ready_to_trace: input.status === "ready",
    ready_to_derive: false,
    ready_to_predict: input.status === "ready",
    ready_to_build: false,
    ready_to_modify: false,
    ready_to_debug: false,
    ready_to_transfer: false,
    ready_to_teach: false,
    blocked_claims: input.blockedClaims,
    supporting_evidence: input.supportingEvidence.map((evidence_id) => ({ evidence_id })),
    blocking_gaps: input.blockingGaps,
    confidence: input.status === "ready" ? "medium" : "low",
    generated_at: now(),
  };
}

export function findEvidenceRef(
  artifactSession: ArtifactSession,
  inventory: WorkspaceInventory,
  citation: EvidenceCitation,
): EvidenceRef {
  const sourcePath = resolveEvidenceSourcePath(artifactSession, citation.file_path);
  const relPath = relativeRepoPath(artifactSession.root_path, sourcePath);
  const match = inventory.evidence.find((entry) => entry.path === relPath);
  return {
    evidence_id: match?.id ?? `EV-CITED-${relPath}:${citation.start_line}`,
    file_path: relPath,
    start_line: citation.start_line,
    end_line: citation.end_line,
    excerpt: citation.excerpt,
    role: match?.role ?? "implementation",
  };
}

export function sourceLinesFromCitation(
  artifactSession: ArtifactSession,
  citation: EvidenceCitation,
): Array<{ line: number; text: string }> {
  try {
    const sourcePath = resolveEvidenceSourcePath(artifactSession, citation.file_path);
    const lines = readFileSync(sourcePath, "utf8").split(/\r?\n/);
    return lines
      .slice(Math.max(0, citation.start_line - 8), Math.min(lines.length, citation.end_line + 8))
      .map((text, index) => ({
        line: Math.max(1, citation.start_line - 7) + index,
        text,
      }));
  } catch {
    return [];
  }
}

export function buildOperationFromSignals(
  goal: string,
  acceptedSignals: ModelSignalCandidate[],
  evidenceIDs: string[],
): UserOperation {
  const signalCriteria = acceptedSignals.slice(0, MAX_OPERATION_CRITERIA).map((signal) => `Cite evidence for: ${signal.claim}`);
  return {
    id: `OP-${randomUUID().slice(0, 8)}`,
    kind: "explain",
    prompt: `Explain the current project slice for this goal using only cited evidence: ${goal}`,
    artifact_ids: [],
    required_evidence: evidenceIDs.slice(0, MAX_OPERATION_EVIDENCE),
    allowed_hints: 0,
    blocked_shortcuts: [
      "Do not claim project facts without citing in-bound evidence.",
      "Do not use source-control summaries as proof unless tied to cited files.",
      "Do not claim readiness before submitting an evidence-backed attempt.",
    ],
    success_criteria: signalCriteria.length > 0
      ? signalCriteria
      : ["Use cited in-bound evidence for every project fact."],
  };
}

export function buildLLMBackedSlice(input: {
  goal: string;
  artifactSession: ArtifactSession;
  inventory: WorkspaceInventory;
  acceptedSignals: ModelSignalCandidate[];
}): {
  concept_slice: DeepOwnershipLoop["concept_slice"];
  thinking_artifacts: ThinkingArtifact[];
  active_operation: UserOperation | null;
} {
  const refs = input.acceptedSignals.flatMap((signal) =>
    signal.citations.map((citation) => findEvidenceRef(input.artifactSession, input.inventory, citation)),
  );
  const evidenceIDs = Array.from(new Set(refs.map((ref) => ref.evidence_id)));
  if (input.acceptedSignals.length === 0 || refs.length === 0) {
    return { concept_slice: null, thinking_artifacts: [], active_operation: null };
  }

  const conceptSliceID = `CS-${randomUUID().slice(0, 8)}`;
  const label = input.acceptedSignals[0].claim.slice(0, MAX_CONCEPT_SLICE_LABEL_LENGTH);
  const operation = buildOperationFromSignals(input.goal, input.acceptedSignals, evidenceIDs);
  const firstCitation = input.acceptedSignals[0].citations[0];
  const firstRef = refs[0];
  const artifact: ThinkingArtifact = {
    id: `TA-${randomUUID().slice(0, 8)}`,
    kind: "code_slice",
    title: `Evidence slice: ${label}`,
    purpose: "Display LLM-proposed, runtime-validated evidence for the current learning goal.",
    concept_slice_id: conceptSliceID,
    source_evidence: refs,
    hidden_solution_evidence: refs,
    user_operation: operation,
    renderer: "code_slice",
    payload: {
      file_path: firstRef.file_path,
      ranges: [{
        start_line: firstRef.start_line,
        end_line: firstRef.end_line,
        role: firstRef.role,
        label: "LLM-cited evidence",
      }],
      selected_symbols: [],
      related_tests: [],
      hidden_lines: [],
      collapsed_context: "Runtime-validated LLM citation",
      lines: sourceLinesFromCitation(input.artifactSession, firstCitation),
    },
    success_criteria: operation.success_criteria,
    created_at: now(),
  };
  operation.artifact_ids = [artifact.id];

  return {
    concept_slice: {
      id: conceptSliceID,
      label,
      domain: "mixed",
      operation_target: "explain",
      prerequisite_concepts: [],
      source_evidence: evidenceIDs,
      behavior_evidence: input.inventory.evidence
        .filter((entry) => entry.role === "behavior_oracle")
        .slice(0, MAX_OPERATION_EVIDENCE)
        .map((entry) => entry.id),
      risk_evidence: input.acceptedSignals
        .filter((signal) => signal.signal_type === "risk")
        .flatMap((signal) => signal.citations.map((citation) =>
          findEvidenceRef(input.artifactSession, input.inventory, citation).evidence_id,
        )),
      expected_user_operations: ["explain", "trace", "predict"],
    },
    thinking_artifacts: [artifact],
    active_operation: operation,
  };
}

function inventoryEntryFromEvidenceRef(ref: EvidenceRef): EvidenceInventoryEntry {
  let sizeBytes = ref.excerpt.length;
  try {
    sizeBytes = statSync(ref.file_path).size;
  } catch {
    // The ref uses repo-relative paths in UI state; excerpt size is enough for synthetic visibility.
  }
  return {
    id: ref.evidence_id,
    path: ref.file_path,
    source_type: ref.role === "behavior_oracle" ? "behavior_oracle" : "implementation",
    size_bytes: sizeBytes,
    extension: ref.file_path.includes(".") ? ref.file_path.split(".").pop() || "" : "",
    role: ref.role,
    content_hash: hashText(`${ref.file_path}:${ref.start_line}:${ref.end_line}:${ref.excerpt}`),
    excerpt: ref.excerpt,
    status: "inspected",
    line_count: ref.end_line,
  };
}

function mergeCitedEvidenceIntoInventory(
  inventory: EvidenceInventoryEntry[],
  refs: EvidenceRef[],
): EvidenceInventoryEntry[] {
  const byID = new Map(inventory.map((entry) => [entry.id, entry]));
  for (const ref of refs) {
    if (!byID.has(ref.evidence_id)) {
      byID.set(ref.evidence_id, inventoryEntryFromEvidenceRef(ref));
    }
  }
  return [...byID.values()];
}

export function buildRunnerSummary(agent: ProjectLearningAgentResult): WorkspaceRunnerSummary {
  if (agent.status === "blocked") {
    return {
      status: "blocked",
      blocked_reason: agent.blocked_reason,
      accepted_signal_count: 0,
      rejected_signal_count: 0,
    };
  }

  return {
    status: "completed",
    model_runner: agent.trace?.model_runner,
    model_name: agent.trace?.model_name,
    reasoning_effort: agent.trace?.reasoning_effort,
    accepted_signal_count: agent.trace?.accepted_signals.length ?? 0,
    rejected_signal_count: agent.trace?.rejected_signals.length ?? 0,
  };
}

export function buildGap(input: {
  loop: DeepOwnershipLoop;
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  gapKind: OwnershipGap["kind"];
}): OwnershipGap {
  return {
    id: `GAP-${randomUUID().slice(0, 8)}`,
    concept_slice_id: input.loop.concept_slice?.id ?? "CS-PENDING",
    kind: input.gapKind,
    user_attempt_ref: input.attempt.id,
    artifact_evidence_refs: input.evidenceCheck.cited_evidence,
    evidence: [
      ...input.evidenceCheck.missing_claims,
      ...input.evidenceCheck.unsupported_claims,
      ...input.evidenceCheck.contradicted_claims,
    ].join(" "),
    severity: input.evidenceCheck.result === "partial" ? "important" : "critical",
    blocks_readiness: true,
    created_at: now(),
  };
}

export function buildRepair(loop: DeepOwnershipLoop, gap: OwnershipGap): RepairAction {
  return {
    id: `REPAIR-${randomUUID().slice(0, 8)}`,
    gap_id: gap.id,
    operation_kind: "trace",
    prompt: "Re-attempt the explanation by tying each claim to one of the runtime-validated evidence citations.",
    required_evidence: loop.thinking_artifacts[0]?.source_evidence ?? [],
    source_gap_id: gap.id,
    created_at: now(),
  };
}

export function buildWorkspaceLoop(input: {
  id: string;
  goal: string;
  artifactSession: ArtifactSession;
  inventory: WorkspaceInventory;
  agent: ProjectLearningAgentResult;
}): DeepOwnershipLoop {
  const acceptedSignals = input.agent.trace?.accepted_signals ?? [];
  const slice = buildLLMBackedSlice({
    goal: input.goal,
    artifactSession: input.artifactSession,
    inventory: input.inventory,
    acceptedSignals,
  });
  const operationID = slice.active_operation?.id ?? "OP-PENDING";
  const conceptSliceID = slice.concept_slice?.id ?? "CS-PENDING";
  const evidenceInventory = mergeCitedEvidenceIntoInventory(
    input.inventory.evidence,
    slice.thinking_artifacts.flatMap((artifact) => artifact.source_evidence),
  );

  const stateChain: DeepOwnershipLoop["loop_entry"]["state_chain"] = [
    "GoalInput",
    "BoundaryConfirmed",
    "EvidenceInventoried",
  ];
  if (slice.concept_slice) stateChain.push("ConceptSliceSelected", "ArtifactGenerated", "AwaitingAttempt");

  return {
    id: input.id,
    goal: input.goal,
    weak_goal_route: detectWeakGoal(input.goal) ? routeWeakGoal(input.goal) : null,
    artifact_boundary: input.inventory.boundary,
    concept_slice: slice.concept_slice,
    thinking_artifacts: slice.thinking_artifacts,
    active_operation: slice.active_operation,
    evidence_inventory: evidenceInventory,
    skip_records: input.inventory.skip_records,
    unknown_zones: input.inventory.unknown_zones,
    workspace_signals: [{
      id: `WS-${randomUUID().slice(0, 8)}`,
      source: "source_control",
      kind: "diff",
      payload: input.inventory.context.source_control,
      evidence_role: "historical_rationale",
      created_at: now(),
    }, {
      id: `WS-${randomUUID().slice(0, 8)}`,
      source: "llm_runner",
      kind: "runtime_trace",
      payload: buildRunnerSummary(input.agent),
      evidence_role: "unknown",
      created_at: now(),
    }],
    sample_attempt: null,
    evidence_check: null,
    detected_gap: null,
    repair_action: null,
    readiness_claim: makeReadinessClaim({
      conceptSliceID,
      operationID,
      status: "unknown",
      scope: slice.concept_slice
        ? "Awaiting user attempt against runtime-validated LLM signals."
        : "Awaiting accepted LLM signals before generating a project explanation operation.",
      blockedClaims: slice.concept_slice ? [] : ["No accepted LLM signals are available for this workspace session."],
      supportingEvidence: [],
      blockingGaps: [],
    }),
    loop_entry: {
      id: `LE-${input.id}`,
      current_state: slice.concept_slice ? "AwaitingAttempt" : "EvidenceInventoried",
      state_chain: stateChain,
      boundary_enforced: true,
      out_of_bound_accesses: 0,
    },
  };
}
