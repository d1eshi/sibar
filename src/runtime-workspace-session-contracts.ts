import type {
  DeepOwnershipLoop,
  EvidenceCheck,
  OwnershipGap,
  ReadinessClaim,
  RepairAction,
  UserAttempt,
} from "./runtime-deep-ownership-loop-types.ts";
import type {
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
} from "./runtime-deep-ownership-evidence-types.ts";
import type { RuntimeWorkspaceSession } from "./runtime-support.ts";

export type WorkspaceArtifactKind =
  | "code"
  | "markdown"
  | "pdf"
  | "paper"
  | "text"
  | "unknown";

export type WorkspaceLineRange = {
  line_start: number;
  line_end: number;
};

export type WorkspaceTreeSnapshot = {
  root_path: string;
  paths: string[];
};

export type SourceControlSummaryContract = {
  available: boolean;
  branch: string | null;
  head: string | null;
  status_short: string;
  diff_stat: string;
  diff_name_status: string;
};

export type EvidenceContract = {
  evidence_id: string;
  artifact_id: string;
  path: string;
  title: string;
  line_range: WorkspaceLineRange;
  location: string;
  label: string;
  excerpt: string;
  required: boolean;
  optional: boolean;
};

export type ArtifactPreviewContract = {
  artifact_id: string;
  path: string;
  title: string;
  artifact_type: WorkspaceArtifactKind;
  language: string | null;
  excerpt: string | null;
  slice_content: string | null;
  line_start: number | null;
  line_end: number | null;
  preview_fallback_reason: string | null;
  evidence_ids: string[];
};

export type ActiveOperationContract = {
  operation_id: string;
  slice_id: string | null;
  operation_kind: string;
  prompt: string;
  required_evidence: string[];
  success_criteria: string[];
};

export type WorkspaceSessionContract = {
  session_id: string;
  repo_root: string;
  project_label: string;
  source_control_summary: SourceControlSummaryContract;
  worktree: WorkspaceTreeSnapshot;
  artifact_tree: WorkspaceTreeSnapshot;
  selected: string[];
  excluded: string[];
  unknown: string[];
  artifact_previews: ArtifactPreviewContract[];
  required_evidence: string[];
  success_criteria: string[];
  current_prompt: string;
  phase: string;
  last_attempt_evaluation?: AttemptEvaluationContract;
  submitted_attempt?: OwnershipAttemptContract;
  next_action: string;
  evidence: EvidenceContract[];
  ui_reproduction: UIReproductionContract;
  active_operation: ActiveOperationContract | null;
};

export type OwnershipAttemptAction = "submit" | "i_do_not_know";

export type OwnershipAttemptContract = {
  session_id: string;
  operation_id: string;
  slice_id: string | null;
  answer_text: string;
  selected_evidence_ids: string[];
  confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
  action: OwnershipAttemptAction;
};

export type AttemptEvidenceResult = "confirmed" | "partial" | "unsupported" | "contradicted";

export type AttemptEvidenceCheckContract = {
  result: AttemptEvidenceResult;
  required_claims: string[];
  observed_claims: string[];
  missing_claims: string[];
  contradicted_claims: string[];
  unsupported_claims: string[];
  cited_evidence: EvidenceContract[];
};

export type DetectedGapContract = {
  kind: string;
  severity: string;
  blocks_readiness: boolean;
};

export type RepairActionContract = {
  id: string;
  operation_kind: string;
  prompt: string;
  required_evidence: string[];
};

export type ScopedReadinessContract = {
  status: ReadinessClaim["status"];
  scope: string;
  blocked_claims: string[];
};

export type WorkspaceSessionEquivalentContract = {
  session_id: string;
  phase: string;
  next_action: string;
};

export type AttemptEvaluationContract = {
  attempt_id: string;
  evidence_check: AttemptEvidenceCheckContract;
  missing_evidence: string[];
  detected_gap: DetectedGapContract | null;
  repair_action: RepairActionContract | null;
  reattempt_prompt: string;
  scoped_readiness: ScopedReadinessContract;
  updated_workspace_session: WorkspaceSessionEquivalentContract | null;
};

export type UIReproductionContract = {
  fixture_path: string | null;
  demo_path: string | null;
  test_path: string | null;
};

type ParsedPayloadLine = {
  line: number;
  text: string;
};

type ParsedPayloadRange = {
  start: number;
  end: number;
};

type ParsedEvidenceLineRange = ParsedPayloadRange & {
  precise: boolean;
};

function hasFiniteLine(value: unknown): value is number {
  return Number.isFinite(value as number) && Number.isInteger(value as number);
}

function readArtifactPath(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const filePath = (payload as { file_path?: unknown }).file_path;
  return typeof filePath === "string" ? filePath.trim() : null;
}

function readArtifactLines(payload: unknown): ParsedPayloadLine[] {
  if (!payload || typeof payload !== "object") return [];
  const rawLines = (payload as { lines?: unknown }).lines;
  if (!Array.isArray(rawLines) || rawLines.length === 0) {
    return [];
  }

  const parsed = rawLines.flatMap((entry) => {
    if (!entry || typeof entry !== "object") {
      return [];
    }
    const lineValue = Number((entry as { line?: unknown }).line);
    const textValue = String((entry as { text?: unknown }).text ?? "").trimEnd();
    if (hasFiniteLine(lineValue) && textValue !== "") {
      return [{ line: lineValue, text: textValue }];
    }
    if (typeof (entry as { line?: unknown }).line === "number") {
      return [{ line: Math.trunc(lineValue), text: "" }];
    }
    return [];
  });

  return parsed;
}

function readArtifactRange(payload: unknown): ParsedPayloadRange | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const ranges = (payload as { ranges?: unknown }).ranges;
  if (!Array.isArray(ranges) || ranges.length === 0) {
    return null;
  }

  const first = ranges[0];
  if (!first || typeof first !== "object") {
    return null;
  }

  const start = Number((first as { start_line?: unknown }).start_line);
  const end = Number((first as { end_line?: unknown }).end_line);
  if (!Number.isInteger(start) || !Number.isInteger(end) || start <= 0 || end <= 0 || end < start) {
    return null;
  }
  return { start, end };
}

function readEvidenceRangeFromLines(payloadLines: ParsedPayloadLine[]): ParsedPayloadRange | null {
  if (payloadLines.length === 0) return null;
  let start = Number.MAX_VALUE;
  let end = Number.MIN_VALUE;
  for (const entry of payloadLines) {
    if (!Number.isFinite(entry.line)) continue;
    if (entry.line < start) start = entry.line;
    if (entry.line > end) end = entry.line;
  }
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }
  return { start, end };
}

function buildArtifactRangeFallback(payloadLines: ParsedPayloadLine[]): ParsedPayloadRange | null {
  return readEvidenceRangeFromLines(payloadLines);
}

function buildEvidenceLineRangeFromRef(ref: EvidenceRef): ParsedPayloadRange | null {
  if (!hasFiniteLine(ref.start_line) || !hasFiniteLine(ref.end_line) || ref.end_line < ref.start_line || ref.start_line <= 0) {
    return null;
  }
  return { start: ref.start_line, end: ref.end_line };
}

function mergeEvidenceRanges(
  current: ParsedEvidenceLineRange | null,
  candidate: ParsedEvidenceLineRange | null,
): ParsedEvidenceLineRange | null {
  if (!candidate) return current;
  if (!current) return candidate;
  if (candidate.precise && !current.precise) {
    return candidate;
  }
  if (current.precise && !candidate.precise) {
    return current;
  }
  const currentSpan = current.end - current.start;
  const candidateSpan = candidate.end - candidate.start;
  return candidateSpan < currentSpan ? candidate : current;
}

function collectEvidenceRangesFromArtifacts(artifacts: ThinkingArtifact[]): Map<string, ParsedPayloadRange> {
  const evidenceRanges = new Map<string, ParsedEvidenceLineRange>();
  for (const artifact of artifacts) {
    const payloadLines = readArtifactLines(artifact.payload);
    const rangeFromPayload = buildArtifactRangeFallback(payloadLines);
    for (const ref of artifact.source_evidence) {
      const candidate = buildEvidenceLineRangeFromRef(ref);
      const candidateRange: ParsedEvidenceLineRange | null = candidate
        ? { ...candidate, precise: true }
        : rangeFromPayload
        ? { ...rangeFromPayload, precise: false }
        : null;
      evidenceRanges.set(
        ref.evidence_id,
        mergeEvidenceRanges(evidenceRanges.get(ref.evidence_id) ?? null, candidateRange),
      );
    }
  }
  const flattened = new Map<string, ParsedPayloadRange>();
  for (const [evidenceId, range] of evidenceRanges.entries()) {
    flattened.set(evidenceId, { start: range.start, end: range.end });
  }
  return flattened;
}

function inferArtifactType(artifactKind: string, artifactPath: string | null): WorkspaceArtifactKind {
  const normalizedKind = artifactKind.toLowerCase();
  const normalizedPath = artifactPath?.toLowerCase() ?? "";
  if (normalizedPath.endsWith(".pdf")) {
    return "pdf";
  }
  if (normalizedPath.includes("paper") && (normalizedPath.endsWith(".md") || normalizedPath.endsWith(".tex") || normalizedPath.includes("/paper"))) {
    return "paper";
  }
  if (normalizedKind === "code_slice" || normalizedKind === "patch_preview") {
    return "code";
  }
  if (normalizedKind.includes("paper") || normalizedKind.includes("hypothesis")) {
    return "paper";
  }
  if (normalizedKind.includes("memory") || normalizedKind.includes("review")) {
    return "text";
  }
  if (normalizedKind.includes("flow") || normalizedKind.includes("architecture") || normalizedKind.includes("concept")) {
    return "markdown";
  }
  return "unknown";
}

function buildArtifactPreviewRange(payload: unknown, payloadLines: ParsedPayloadLine[]): ParsedPayloadRange | null {
  return readArtifactRange(payload) ?? readEvidenceRangeFromLines(payloadLines);
}

function buildArtifactPreviewFallbackReason(params: {
  artifactType: WorkspaceArtifactKind;
  previewHasText: boolean;
  criteriaCount: number;
}): string | null {
  const reasons: string[] = [];
  if (params.criteriaCount === 0) {
    reasons.push("no success criteria provided");
  }
  if (!params.previewHasText && (params.artifactType === "pdf" || params.artifactType === "paper")) {
    reasons.push(`no renderable ${params.artifactType} preview text`);
  }
  return reasons.length > 0 ? reasons.join("; ") : null;
}

export function buildOwnershipAttemptContract(input: {
  session_id: string;
  operation_id: string;
  slice_id: string | null;
  answer_text: string;
  selected_evidence_ids: string[];
  confidence: "low" | "medium" | "high";
  declared_unknowns: string[];
  action?: OwnershipAttemptAction;
}): OwnershipAttemptContract {
  const action = input.action ?? "submit";

  return {
    session_id: input.session_id,
    operation_id: input.operation_id,
    slice_id: input.slice_id,
    answer_text: input.answer_text,
    selected_evidence_ids: input.selected_evidence_ids,
    confidence: input.confidence,
    declared_unknowns: input.declared_unknowns,
    action,
  };
}

function toWorkspaceTree(paths: string[], root: string): WorkspaceTreeSnapshot {
  const uniquePaths = [...new Set(paths)]
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .sort();
  return { root_path: root, paths: uniquePaths };
}

function buildEvidenceContracts(
  evidenceInventory: EvidenceInventoryEntry[],
  requiredEvidenceIds: readonly string[],
  evidenceLineRanges: Map<string, ParsedPayloadRange>,
): EvidenceContract[] {
  return evidenceInventory.map((evidence): EvidenceContract => {
    const title = evidence.path.split("/").at(-1) ?? evidence.path;
    const preciseRange = evidenceLineRanges.get(evidence.id);
    const fallbackEnd = evidence.line_count && evidence.line_count > 0 ? evidence.line_count : 1;
    return {
      evidence_id: evidence.id,
      artifact_id: evidence.id,
      path: evidence.path,
      title,
      line_range: {
        line_start: preciseRange?.start ?? 1,
        line_end: preciseRange?.end ?? fallbackEnd,
      },
      location: evidence.path,
      label: evidence.role,
      excerpt: evidence.excerpt,
      required: requiredEvidenceIds.includes(evidence.id),
      optional: !requiredEvidenceIds.includes(evidence.id),
    };
  });
}

function buildArtifactPreviews(loop: DeepOwnershipLoop): ArtifactPreviewContract[] {
  return loop.thinking_artifacts.map((artifact) => {
    const firstSourceRef = artifact.source_evidence.at(0) as EvidenceRef | undefined;
    const evidencePath = firstSourceRef?.file_path;
    const fallbackPath = evidencePath ?? artifact.title;
    const payloadPath = readArtifactPath(artifact.payload);
    const path = payloadPath ?? fallbackPath;
    const payloadLines = readArtifactLines(artifact.payload);
    const previewRange = buildArtifactPreviewRange(artifact.payload, payloadLines);
    const payloadExcerpt = artifact.payload && typeof artifact.payload === "object"
      ? (artifact.payload as { excerpt?: unknown }).excerpt
      : undefined;
    const sliceText = payloadLines.length > 0
      ? payloadLines.map((entry) => entry.text).join("\n")
      : null;
    const fallbackExcerpt = payloadLines.length > 0
      ? payloadLines.find((entry) => entry.text.trim().length > 0)?.text ?? null
      : null;
    const excerpt = typeof payloadExcerpt === "string" ? payloadExcerpt.trim() : null;
    const effectiveExcerpt = excerpt && excerpt.length > 0
      ? excerpt
      : (fallbackExcerpt && fallbackExcerpt.length > 0 ? fallbackExcerpt : null);
    const artifactType = inferArtifactType(artifact.kind, path);
    const previewHasText = (effectiveExcerpt && effectiveExcerpt.length > 0)
      || (sliceText && sliceText.trim().length > 0);
    const language = artifact.payload && typeof artifact.payload === "object"
      ? (artifact.payload as { language?: unknown }).language
      : undefined;

    return {
      artifact_id: artifact.id,
      path,
      title: artifact.title,
      artifact_type: artifactType,
      language: typeof language === "string" ? language : null,
      excerpt: effectiveExcerpt,
      slice_content: sliceText,
      line_start: previewRange?.start ?? null,
      line_end: previewRange?.end ?? null,
      preview_fallback_reason: buildArtifactPreviewFallbackReason({
        artifactType,
        previewHasText: previewHasText,
        criteriaCount: artifact.success_criteria.length,
      }),
      evidence_ids: artifact.source_evidence.map((entry) => entry.evidence_id),
    };
  });
}

function buildWorktreePaths(loop: DeepOwnershipLoop): string[] {
  return [
    ...loop.artifact_boundary.included_sources,
    ...loop.evidence_inventory.map((entry) => entry.path),
  ];
}

const LIVE_WORKSPACE_UI_REPRODUCTION_TEST_PATH = "Tests/workspace-live-session.test.ts";

function buildActiveOperation(input: DeepOwnershipLoop["active_operation"], sliceId: string | null): ActiveOperationContract | null {
  if (!input) {
    return null;
  }

  return {
    operation_id: input.id,
    slice_id: sliceId,
    operation_kind: input.kind,
    prompt: input.prompt,
    required_evidence: input.required_evidence ?? [],
    success_criteria: input.success_criteria ?? [],
  };
}

function buildAttemptResult(result: EvidenceCheck["result"]): AttemptEvidenceResult {
  if (result === "confirmed") return "confirmed";
  if (result === "partial") return "partial";
  if (result === "contradiction") return "contradicted";
  return "unsupported";
}

function buildNextAction(loop: DeepOwnershipLoop): string {
  if (loop.loop_entry.current_state === "GapOrReady") {
    return "review readiness and repair if needed";
  }
  if (loop.loop_entry.current_state === "AwaitingAttempt") {
    return "submit ownership attempt";
  }
  if (loop.loop_entry.current_state === "AttemptStored" || loop.loop_entry.current_state === "EvidenceChecked") {
    return "inspect attempt evaluation";
  }
  return "continue workspace loop";
}

function buildEquivalentWorkspaceSession(input: {
  sessionId: string;
  loop: DeepOwnershipLoop;
}): WorkspaceSessionEquivalentContract {
  return {
    session_id: input.sessionId,
    phase: input.loop.loop_entry.current_state,
    next_action: buildNextAction(input.loop),
  };
}

export function buildWorkspaceSessionContract(input: {
  session: RuntimeWorkspaceSession;
  artifactSessionLabel: string;
  artifactSessionRootPath: string;
  lastAttemptEvaluation?: AttemptEvaluationContract | null;
  submittedAttempt?: OwnershipAttemptContract;
  fixtureModelResponsePath?: string | null;
}): WorkspaceSessionContract {
  const operation = input.session.loop.active_operation;
  const requiredEvidenceIds = operation?.required_evidence ?? [];
  const evidenceLineRanges = collectEvidenceRangesFromArtifacts(input.session.loop.thinking_artifacts);
  const evidence = buildEvidenceContracts(
    input.session.loop.evidence_inventory,
    requiredEvidenceIds,
    evidenceLineRanges,
  );
  const artifactPreviews = buildArtifactPreviews(input.session.loop);
  const selected = input.session.loop.artifact_boundary?.included_sources?.length
    ? input.session.loop.artifact_boundary.included_sources
    : [];
  const excluded = input.session.loop.artifact_boundary?.excluded_sources?.length
    ? input.session.loop.artifact_boundary.excluded_sources
    : [];
  const unknown = input.session.loop.unknown_zones.map((entry) => entry.reason ?? entry.id);
  const worktree = toWorkspaceTree(
    buildWorktreePaths(input.session.loop),
    input.artifactSessionRootPath,
  );
  const artifactTree = toWorkspaceTree(
    artifactPreviews.map((artifact) => artifact.path),
    input.artifactSessionRootPath,
  );
  const sliceId = input.session.loop.concept_slice?.id ?? null;

  return {
    session_id: input.session.workspace_session_id,
    repo_root: input.artifactSessionRootPath,
    project_label: input.artifactSessionLabel,
    source_control_summary: {
      available: input.session.source_control.available,
      branch: input.session.source_control.branch,
      head: input.session.source_control.head,
      status_short: input.session.source_control.status_short,
      diff_stat: input.session.source_control.diff_stat,
      diff_name_status: input.session.source_control.diff_name_status,
    },
    worktree,
    artifact_tree: artifactTree,
    selected,
    excluded,
    unknown,
    artifact_previews: artifactPreviews,
    required_evidence: requiredEvidenceIds,
    success_criteria: operation?.success_criteria ?? [],
    current_prompt: operation?.prompt ?? input.session.loop.concept_slice?.label ?? "Collect an operation before submitting.",
    phase: input.session.loop.loop_entry.current_state,
    last_attempt_evaluation: input.lastAttemptEvaluation,
    submitted_attempt: input.submittedAttempt,
    next_action: buildNextAction(input.session.loop),
    evidence,
    ui_reproduction: buildUIReproductionContract({
      testPath: LIVE_WORKSPACE_UI_REPRODUCTION_TEST_PATH,
      demoPath: null,
      fixturePath: input.fixtureModelResponsePath ?? null,
    }),
    active_operation: buildActiveOperation(operation, sliceId),
  };
}

export function buildAttemptEvaluationContract(input: {
  attempt: UserAttempt;
  evidenceCheck: EvidenceCheck;
  sessionId: string;
  loop: DeepOwnershipLoop;
  detectedGap: OwnershipGap | null;
  repairAction: RepairAction | null;
}): AttemptEvaluationContract {
  const citedEvidence = input.evidenceCheck.cited_evidence.map((entry) => ({
    evidence_id: entry.evidence_id,
    artifact_id: entry.evidence_id,
    path: entry.file_path,
    title: entry.file_path.split("/").at(-1) ?? entry.file_path,
    line_range: {
      line_start: entry.start_line,
      line_end: entry.end_line,
    },
    location: entry.file_path,
    label: entry.role,
    excerpt: entry.excerpt,
    required: input.evidenceCheck.required_claims.length > 0,
    optional: input.evidenceCheck.required_claims.length === 0,
  }));

  const evidenceCheck: AttemptEvidenceCheckContract = {
    result: buildAttemptResult(input.evidenceCheck.result),
    required_claims: input.evidenceCheck.required_claims,
    observed_claims: input.evidenceCheck.observed_claims,
    missing_claims: input.evidenceCheck.missing_claims,
    contradicted_claims: input.evidenceCheck.contradicted_claims,
    unsupported_claims: input.evidenceCheck.unsupported_claims,
    cited_evidence: citedEvidence,
  };
  const requiredEvidenceIds = input.loop.active_operation?.required_evidence ?? [];
  const selectedEvidenceIds = new Set(input.attempt.selected_evidence);
  const citedEvidenceIds = new Set(input.evidenceCheck.cited_evidence.map((entry) => entry.evidence_id));
  const missingEvidence = Array.from(
    new Set(
      requiredEvidenceIds.filter(
        (evidenceId) => !selectedEvidenceIds.has(evidenceId) || !citedEvidenceIds.has(evidenceId),
      ),
    ),
  );

  return {
    attempt_id: input.attempt.id,
    evidence_check: evidenceCheck,
    missing_evidence: missingEvidence,
    detected_gap: input.detectedGap ? {
      kind: input.detectedGap.kind,
      severity: input.detectedGap.severity,
      blocks_readiness: input.detectedGap.blocks_readiness,
    } : null,
    repair_action: input.repairAction ? {
      id: input.repairAction.id,
      operation_kind: input.repairAction.operation_kind,
      prompt: input.repairAction.prompt,
      required_evidence: input.repairAction.required_evidence.map((entry) => entry.evidence_id),
    } : null,
    reattempt_prompt: input.loop.loop_entry.current_state === "GapOrReady"
      ? "Submit a corrected attempt using the required evidence IDs and explicitly mark unknowns."
      : "Retry the same operation with clearer scope and evidence."
    ,
    scoped_readiness: {
      status: input.loop.readiness_claim.status,
      scope: input.loop.readiness_claim.scope,
      blocked_claims: input.loop.readiness_claim.blocked_claims,
    },
    updated_workspace_session: buildEquivalentWorkspaceSession({
      sessionId: input.sessionId,
      loop: input.loop,
    }),
  };
}

export function buildUIReproductionContract(input: {
  fixturePath?: string | null;
  demoPath?: string | null;
  testPath?: string | null;
}): UIReproductionContract {
  return {
    fixture_path: input.fixturePath ?? null,
    demo_path: input.demoPath ?? null,
    test_path: input.testPath ?? null,
  };
}
