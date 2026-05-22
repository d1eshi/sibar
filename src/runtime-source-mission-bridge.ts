import type {
  EvidenceInventoryEntry,
  EvidenceRef,
  ThinkingArtifact,
  ThinkingArtifactKind,
  UserOperation,
  UserOperationKind,
  ConceptSlice,
} from "./runtime-deep-ownership.ts";
import type {
  MissionPreview,
  PedagogyInput,
  ProposedSession,
  SessionSeed,
  SourceIntakeResult,
  SourceSignal,
  SourceSlice,
} from "./runtime-source-mission-contracts.ts";

export type MissionSessionBridgeDiagnosticSeverity = "error" | "warning" | "info";

export type MissionSessionBridgeDiagnostic = {
  code: string;
  message: string;
  severity: MissionSessionBridgeDiagnosticSeverity;
  path?: string;
  value?: string;
};

export type MissionSessionBridgeInput = {
  mission_preview: MissionPreview;
  proposed_session: ProposedSession;
  source_signals: SourceSignal[];
  source_slices: SourceSlice[];
  source_intake: SourceIntakeResult;
  user_reason: string;
};

export type MissionSessionBridgeOutput = {
  session_seed: SessionSeed;
  concept_slice: ConceptSlice;
  user_operation: UserOperation;
  thinking_artifacts: ThinkingArtifact[];
  evidence_inventory: EvidenceInventoryEntry[];
  pedagogy_input: PedagogyInput;
  diagnostics: MissionSessionBridgeDiagnostic[];
};

export type MissionSessionBridgeResult =
  | { ok: true; value: MissionSessionBridgeOutput; diagnostics: MissionSessionBridgeDiagnostic[] }
  | { ok: false; value: null; diagnostics: MissionSessionBridgeDiagnostic[] };

const CREATED_AT = "1970-01-01T00:00:00.000Z";

const OPERATION_PATTERNS: readonly [UserOperationKind, readonly RegExp[]][] = [
  ["trace", [/\btrace\b/i, /\bmap\s+flow\b/i, /\bflow\s+map\b/i]],
  ["derive", [/\bderive\b/i, /\bderivation\b/i, /\bprove\b/i]],
  ["predict", [/\bpredict\b/i, /\bforecast\b/i]],
  ["build", [/\bimplement\b/i, /\bbuild\b/i, /\bcode\b/i]],
  ["modify", [/\bmodify\b/i, /\brefactor\b/i]],
  ["debug", [/\bdebug\b/i, /\bdiagnos(?:e|is)\b/i]],
  ["transfer", [/\btransfer\b/i, /\bapply\b/i]],
  ["teach", [/\bteach\b/i, /\btutor\b/i]],
  ["explain", [/\bexplain\b/i, /\bread\b/i, /\bmap\b/i, /\bsummarize\b/i, /\bsummary\b/i]],
];

const ARTIFACT_PATTERNS: readonly [ThinkingArtifactKind, readonly RegExp[]][] = [
  ["minimal_build", [/\bcode\s+probe\b/i, /\bminimal\s+build\b/i]],
  ["experiment_card", [/\bbenchmark\s+report\b/i, /\bexperiment\b/i]],
  ["equation_breakdown", [/\bderivation\b/i, /\bequation\b/i, /\bproof\b/i]],
  ["hypothesis_table", [/\bclaim\s+map\b/i, /\bevidence\s+table\b/i, /\bhypothesis\b/i]],
  ["flow_diagram", [/\bdiagram\b/i, /\bflow\b/i]],
  ["paper_excerpt", [/\btechnical\s+note\b/i, /\bpaper\s+excerpt\b/i]],
  ["concept_ladder", [/\brecall\s+card\b/i, /\btransfer\s+exercise\b/i, /\bconcept\s+ladder\b/i]],
];

function addDiagnostic(
  diagnostics: MissionSessionBridgeDiagnostic[],
  code: string,
  message: string,
  severity: MissionSessionBridgeDiagnosticSeverity = "error",
  path?: string,
  value?: string,
): void {
  diagnostics.push({ code, message, severity, path, value });
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))];
}

function stableHash(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function stableId(prefix: string, value: string): string {
  return `${prefix}-${stableHash(value)}`;
}

function isValidSourceRef(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && !/\s/.test(value);
}

function mapOperation(operation: string): UserOperationKind | null {
  for (const [kind, patterns] of OPERATION_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(operation))) {
      return kind;
    }
  }
  return null;
}

function mapArtifactKind(label: string, operationKind: UserOperationKind): ThinkingArtifactKind {
  for (const [kind, patterns] of ARTIFACT_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(label))) {
      return kind;
    }
  }
  if (operationKind === "build" || operationKind === "modify" || operationKind === "debug") {
    return "minimal_build";
  }
  if (operationKind === "trace") return "flow_diagram";
  if (operationKind === "derive") return "equation_breakdown";
  if (operationKind === "predict") return "hypothesis_table";
  return "concept_ladder";
}

function evidenceRefFromEntry(entry: EvidenceInventoryEntry): EvidenceRef {
  return {
    evidence_id: entry.id,
    file_path: entry.path,
    start_line: 1,
    end_line: entry.line_count ?? 1,
    excerpt: entry.excerpt,
    role: entry.role,
  };
}

function toEvidenceEntry(input: {
  idMaterial: string;
  path: string;
  excerpt: string;
}): EvidenceInventoryEntry {
  return {
    id: stableId("EVID", input.idMaterial),
    path: input.path,
    source_type: "source_truth",
    size_bytes: new TextEncoder().encode(input.excerpt).length,
    extension: ".source",
    role: "source_truth",
    content_hash: stableHash(`${input.path}|${input.excerpt}`),
    excerpt: input.excerpt,
    status: "inspected",
    line_count: 1,
  };
}

function buildSuccessCriteria(input: {
  operationKind: UserOperationKind;
  sessionTitle: string;
  labels: string[];
}): string[] {
  const labels = unique(input.labels).slice(0, 3);
  const criteria = labels.map((label) =>
    `${input.operationKind} the source claim for ${label} with cited evidence`,
  );
  if (criteria.length > 0) return criteria;
  return [`${input.operationKind} ${input.sessionTitle} with cited source evidence`];
}

export function buildMissionSessionBridge(input: MissionSessionBridgeInput): MissionSessionBridgeResult {
  const diagnostics: MissionSessionBridgeDiagnostic[] = [];
  const signalsById = new Map(input.source_signals.map((signal) => [signal.id, signal]));
  const slicesById = new Map(input.source_slices.map((slice) => [slice.slice_id, slice]));
  const slicesBySignalId = new Map<string, SourceSlice[]>();

  for (const slice of input.source_slices) {
    for (const signalId of slice.source_signal_ids) {
      const existing = slicesBySignalId.get(signalId) ?? [];
      existing.push(slice);
      slicesBySignalId.set(signalId, existing);
    }
  }

  const sourceSliceRefs: string[] = [];
  const sourceSignalIds: string[] = [];

  for (const ref of input.proposed_session.source_slice_refs) {
    const slice = slicesById.get(ref);
    if (slice) {
      sourceSliceRefs.push(slice.slice_id);
      sourceSignalIds.push(...slice.source_signal_ids);
      continue;
    }

    const signal = signalsById.get(ref);
    if (signal) {
      sourceSignalIds.push(signal.id);
      const owningSlices = slicesBySignalId.get(signal.id) ?? [];
      sourceSliceRefs.push(...owningSlices.map((owningSlice) => owningSlice.slice_id));
      continue;
    }

    addDiagnostic(
      diagnostics,
      "unknown_source_ref",
      `ProposedSession.source_slice_refs contains an unknown SourceSlice or SourceSignal ref: ${ref}`,
      "error",
      "proposed_session.source_slice_refs",
      ref,
    );
  }

  const normalizedSliceRefs = unique(sourceSliceRefs);
  const normalizedSignalIds = unique(sourceSignalIds);

  if (normalizedSliceRefs.length === 0) {
    addDiagnostic(
      diagnostics,
      "no_resolved_source_slices",
      "Bridge could not resolve any SourceSlice records for the proposed session.",
    );
  }

  const operationKind = mapOperation(input.proposed_session.operation);
  if (!operationKind) {
    addDiagnostic(
      diagnostics,
      "unsupported_operation",
      `Unsupported ProposedSession.operation: ${input.proposed_session.operation}`,
      "error",
      "proposed_session.operation",
      input.proposed_session.operation,
    );
  }

  const resolvedSlices = normalizedSliceRefs
    .map((sliceRef) => slicesById.get(sliceRef))
    .filter((slice): slice is SourceSlice => Boolean(slice));
  const resolvedSignals = normalizedSignalIds
    .map((signalId) => signalsById.get(signalId))
    .filter((signal): signal is SourceSignal => Boolean(signal));

  for (const slice of resolvedSlices) {
    if (!isValidSourceRef(slice.excerpt_ref)) {
      addDiagnostic(
        diagnostics,
        "invalid_source_slice_excerpt_ref",
        `SourceSlice.excerpt_ref must be a non-empty, whitespace-free source reference: ${slice.slice_id}`,
        "error",
        `source_slices.${slice.slice_id}.excerpt_ref`,
        typeof slice.excerpt_ref === "string" ? slice.excerpt_ref : undefined,
      );
    }
    if (typeof slice.excerpt !== "string" || slice.excerpt.trim().length === 0) {
      addDiagnostic(
        diagnostics,
        "missing_source_slice_excerpt",
        `SourceSlice.excerpt must contain the textual evidence for slice: ${slice.slice_id}`,
        "error",
        `source_slices.${slice.slice_id}.excerpt`,
        typeof slice.excerpt === "string" ? slice.excerpt : undefined,
      );
    }
  }

  for (const signal of resolvedSignals) {
    if (!isValidSourceRef(signal.source_excerpt_ref)) {
      addDiagnostic(
        diagnostics,
        "invalid_source_signal_excerpt_ref",
        `SourceSignal.source_excerpt_ref must be a non-empty, whitespace-free source reference: ${signal.id}`,
        "error",
        `source_signals.${signal.id}.source_excerpt_ref`,
        typeof signal.source_excerpt_ref === "string" ? signal.source_excerpt_ref : undefined,
      );
    }
  }

  if (diagnostics.some((diagnostic) => diagnostic.severity === "error") || !operationKind) {
    return { ok: false, value: null, diagnostics };
  }

  const evidenceEntriesByMaterial = new Map<string, EvidenceInventoryEntry>();

  for (const slice of resolvedSlices) {
    const excerptRef = slice.excerpt_ref.trim();
    const excerpt = slice.excerpt.trim();
    const material = `slice|${slice.slice_id}|${excerptRef}`;
    evidenceEntriesByMaterial.set(
      material,
      toEvidenceEntry({
        idMaterial: material,
        path: excerptRef,
        excerpt,
      }),
    );
  }

  const evidenceInventory = [...evidenceEntriesByMaterial.values()].sort((a, b) => a.id.localeCompare(b.id));
  const evidenceRefs = evidenceInventory.map(evidenceRefFromEntry);
  const evidenceIds = evidenceInventory.map((entry) => entry.id);
  const labels = [
    ...resolvedSlices.map((slice) => slice.label),
    ...resolvedSignals.map((signal) => signal.label),
  ];
  const successCriteria = buildSuccessCriteria({
    operationKind,
    sessionTitle: input.proposed_session.title,
    labels,
  });
  const recommendedArtifacts = input.proposed_session.recommended_artifacts.length > 0
    ? input.proposed_session.recommended_artifacts.slice(0, 3)
    : [input.proposed_session.title];
  const artifactIds = recommendedArtifacts.map((artifactLabel, index) =>
    `${input.proposed_session.id}-artifact-${index + 1}-${stableHash(artifactLabel).slice(0, 6)}`,
  );

  const sessionSeed: SessionSeed = {
    session_id: input.proposed_session.id,
    track_id: input.proposed_session.track_id,
    source_signal_ids: normalizedSignalIds,
    source_slice_refs: normalizedSliceRefs,
    operation: operationKind,
    required_artifacts: artifactIds,
    required_evidence: evidenceIds,
    success_criteria: successCriteria,
    ...(input.proposed_session.prerequisite_note
      ? { prerequisite_note: input.proposed_session.prerequisite_note }
      : {}),
    status: input.proposed_session.status,
  };

  const conceptSlice: ConceptSlice = {
    id: `${input.proposed_session.id}-concept`,
    label: input.proposed_session.title,
    domain: "mixed",
    operation_target: operationKind,
    prerequisite_concepts: input.proposed_session.prerequisite_note
      ? [input.proposed_session.prerequisite_note]
      : [],
    source_evidence: evidenceIds,
    behavior_evidence: [],
    risk_evidence: [],
    expected_user_operations: [operationKind],
  };

  const userOperation: UserOperation = {
    id: `${input.proposed_session.id}-operation`,
    kind: operationKind,
    prompt: `${input.proposed_session.operation}\n\nUser reason: ${input.user_reason}`,
    artifact_ids: artifactIds,
    required_evidence: evidenceIds,
    allowed_hints: 2,
    blocked_shortcuts: [
      "Do not claim readiness for the full mission.",
      "Do not cite evidence outside the declared inventory.",
    ],
    success_criteria: successCriteria,
  };

  const thinkingArtifacts: ThinkingArtifact[] = recommendedArtifacts.map((artifactLabel, index) => {
    const artifactKind = mapArtifactKind(artifactLabel, operationKind);
    return {
      id: artifactIds[index],
      kind: artifactKind,
      title: artifactLabel,
      purpose: `Produce ${artifactLabel} for ${input.proposed_session.title}.`,
      concept_slice_id: conceptSlice.id,
      source_evidence: evidenceRefs,
      hidden_solution_evidence: [],
      user_operation: userOperation,
      renderer: artifactKind,
      payload: {
        mission_title: input.mission_preview.mission_title,
        source_intake_id: input.source_intake.id,
        source_slice_refs: normalizedSliceRefs,
        source_signal_ids: normalizedSignalIds,
      },
      success_criteria: successCriteria,
      created_at: CREATED_AT,
    };
  });

  const pedagogyInput: PedagogyInput = {
    session_seed: sessionSeed,
    user_attempt: null,
    cited_evidence: [],
  };

  const value: MissionSessionBridgeOutput = {
    session_seed: sessionSeed,
    concept_slice: conceptSlice,
    user_operation: userOperation,
    thinking_artifacts: thinkingArtifacts,
    evidence_inventory: evidenceInventory,
    pedagogy_input: pedagogyInput,
    diagnostics,
  };

  return { ok: true, value, diagnostics };
}
