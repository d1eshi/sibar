/**
 * Deterministic Thinking Artifact Generation
 *
 * Generates code-slice and flow-diagram thinking artifacts from bounded
 * evidence inventory. Every important claim cites evidence or is explicitly
 * marked inferred/unknown. Conflicting evidence roles produce
 * contradiction/unknown markers. Hidden solution refs are preserved in full
 * artifacts but excluded from pre-attempt snapshots.
 *
 * Implements: VAL-ARTIFACT-002, VAL-ARTIFACT-005, VAL-INTEL-004
 */

import {
  type ThinkingArtifact,
  type ThinkingArtifactKind,
  type EvidenceRef,
  type EvidenceRole,
  type EvidenceInventoryEntry,
  type ConceptSlice,
  type DeepOwnershipFixture,
  type UserOperationKind,
  RECOGNIZED_EVIDENCE_ROLES,
} from "./runtime-deep-ownership.ts";

// ── Types ─────────────────────────────────────────────────────────────

export type ArtifactClaim = {
  /** The claim text */
  text: string;
  /** Evidence IDs cited for this claim */
  cited_evidence: string[];
  /** Whether the claim is explicitly inferred (not directly evidenced) */
  is_inferred: boolean;
  /** Whether the claim is explicitly unknown */
  is_unknown: boolean;
};

export type CitationValidationResult = {
  valid: boolean;
  uncited_claims: string[];
  orphaned_refs: EvidenceRef[];
  issues: string[];
  summary: string;
};

export type AuthorityCheckResult = {
  authoritative_source: EvidenceRole;
  conflict: boolean;
  resolution: string;
};

export type GeneratedNode = {
  id: string;
  label: string;
  role: "input" | "process" | "data" | "output" | "unknown";
  evidence: string[];
  is_inferred: boolean;
  user_prompt: string;
};

export type GeneratedEdge = {
  from: string;
  to: string;
  relation: string;
  evidence: string[];
  is_inferred: boolean;
};

// ── Authority Rankings ────────────────────────────────────────────────

/**
 * Evidence role authority ranking. Higher number = more authoritative.
 *
 * Implementation/source_truth are highest authority. Intent/docs are lower.
 * When roles conflict, the higher-ranked role is authoritative and the
 * lower-ranked evidence must be treated as potentially incorrect.
 */
export const AUTHORITY_RANK: Record<EvidenceRole, number> = {
  source_truth: 10,
  implementation: 10,
  behavior_oracle: 8,
  counterexample: 7,
  experiment: 6,
  interface: 5,
  intent: 4,
  historical_rationale: 2,
  unknown: 0,
};

// ── Citation Helpers ──────────────────────────────────────────────────

/**
 * Check whether a claim is uncited — has no evidence and is not
 * explicitly marked inferred or unknown.
 */
export function isClaimUncited(claim: ArtifactClaim): boolean {
  if (claim.is_inferred || claim.is_unknown) return false;
  return claim.cited_evidence.length === 0;
}

/**
 * Mark a claim as inferred (lacking direct evidence but reasonable).
 */
export function markInferred(claim: ArtifactClaim): ArtifactClaim {
  return { ...claim, is_inferred: true };
}

/**
 * Mark a claim as unknown (lacking any evidence).
 */
export function markUnknown(claim: ArtifactClaim): ArtifactClaim {
  return { ...claim, is_unknown: true };
}

// ── Source Authority ──────────────────────────────────────────────────

/**
 * Resolve evidence authority when two evidence sources disagree.
 * Higher-ranked roles are treated as definitive. Equal low-authority
 * roles produce unknown markers.
 */
export function resolveEvidenceAuthority(
  roleA: EvidenceRole,
  roleB: EvidenceRole,
): AuthorityCheckResult {
  const rankA = AUTHORITY_RANK[roleA] ?? 0;
  const rankB = AUTHORITY_RANK[roleB] ?? 0;

  if (rankA === rankB && roleA === roleB) {
    return {
      authoritative_source: roleA,
      conflict: false,
      resolution: `Both sources agree (${roleA})`,
    };
  }

  if (rankA === rankB && roleA !== roleB) {
    return {
      authoritative_source: "unknown",
      conflict: true,
      resolution: `Conflicting evidence from equally-ranked roles: ${roleA} and ${roleB}. ` +
        `Both rank at ${rankA}. Resolution is unknown without further evidence.`,
    };
  }

  if (rankA > rankB) {
    return {
      authoritative_source: roleA,
      conflict: true,
      resolution: `${roleA} (rank ${rankA}) takes authority over ${roleB} (rank ${rankB}). ` +
        `Evidence from ${roleB} may be incorrect or outdated.`,
    };
  }

  return {
    authoritative_source: roleB,
    conflict: true,
    resolution: `${roleB} (rank ${rankB}) takes authority over ${roleA} (rank ${rankA}). ` +
      `Evidence from ${roleA} may be incorrect or outdated.`,
  };
}

/**
 * Detect conflicting evidence roles in a set of evidence refs.
 * Returns true if there are conflicts that need resolution.
 */
export function detectEvidenceRoleConflicts(
  refs: EvidenceRef[],
): { hasConflict: boolean; conflicts: AuthorityCheckResult[] } {
  const conflicts: AuthorityCheckResult[] = [];
  for (let i = 0; i < refs.length; i++) {
    for (let j = i + 1; j < refs.length; j++) {
      if (refs[i].role !== refs[j].role) {
        const result = resolveEvidenceAuthority(refs[i].role, refs[j].role);
        if (result.conflict) {
          conflicts.push(result);
        }
      }
    }
  }
  return { hasConflict: conflicts.length > 0, conflicts };
}

// ── Citation Validation ───────────────────────────────────────────────

/**
 * Validate that a thinking artifact's citations are grounded in the
 * evidence inventory. Every source_evidence ref must reference a
 * real inventory entry. Artifacts without source_evidence fail closed.
 */
export function validateArtifactCitations(
  artifact: ThinkingArtifact,
  evidenceInventory: EvidenceInventoryEntry[],
): CitationValidationResult {
  const issues: string[] = [];
  const uncitedClaims: string[] = [];
  const orphanedRefs: EvidenceRef[] = [];
  const inventoryIds = new Set(evidenceInventory.map((e) => e.id));

  // Check source_evidence is non-empty
  if (!Array.isArray(artifact.source_evidence) || artifact.source_evidence.length === 0) {
    issues.push("Artifact has no source evidence — all claims are effectively uncited");
    uncitedClaims.push("Entire artifact lacks source evidence citations");
  }

  // Check every source_evidence ref references a real inventory entry
  for (const ref of artifact.source_evidence) {
    if (!inventoryIds.has(ref.evidence_id)) {
      orphanedRefs.push(ref);
      issues.push(
        `Source evidence ref ${ref.evidence_id} (${ref.file_path}:${ref.start_line}) ` +
        `does not exist in evidence inventory`,
      );
    }
  }

  // Check hidden_solution_evidence refs for validity
  if (Array.isArray(artifact.hidden_solution_evidence)) {
    for (const ref of artifact.hidden_solution_evidence) {
      if (!inventoryIds.has(ref.evidence_id)) {
        issues.push(
          `Hidden solution evidence ref ${ref.evidence_id} does not exist in inventory`,
        );
      }
    }
  }

  // Check required_evidence in user_operation
  if (artifact.user_operation && Array.isArray(artifact.user_operation.required_evidence)) {
    for (const evId of artifact.user_operation.required_evidence) {
      if (!inventoryIds.has(evId)) {
        issues.push(
          `User operation requires evidence ${evId} which does not exist in inventory`,
        );
      }
    }
  }

  // Check title and purpose are non-empty (they constitute claims)
  if (!artifact.title || artifact.title.trim().length === 0) {
    issues.push("Artifact title is empty");
    uncitedClaims.push("Missing artifact title");
  }
  if (!artifact.purpose || artifact.purpose.trim().length === 0) {
    issues.push("Artifact purpose is empty");
    uncitedClaims.push("Missing artifact purpose");
  }

  // Check basic structural validity
  if (!artifact.id || artifact.id.trim().length === 0) {
    issues.push("Artifact missing id");
  }
  if (!artifact.user_operation || !artifact.user_operation.kind) {
    issues.push("Artifact missing user operation");
  }
  if (!Array.isArray(artifact.success_criteria) || artifact.success_criteria.length === 0) {
    issues.push("Artifact has no success criteria");
  }

  const valid =
    issues.length === 0 &&
    uncitedClaims.length === 0 &&
    orphanedRefs.length === 0 &&
    artifact.source_evidence.length > 0;

  return {
    valid,
    uncited_claims: uncitedClaims,
    orphaned_refs: orphanedRefs,
    issues,
    summary: valid
      ? "All citations grounded in evidence inventory"
      : `Citation validation failed: ${issues.length} issue(s), ${uncitedClaims.length} uncited claim(s), ${orphanedRefs.length} orphaned ref(s)`,
  };
}

// ── Evidence Helpers ──────────────────────────────────────────────────

function findEvidenceById(
  inventory: EvidenceInventoryEntry[],
  id: string,
): EvidenceInventoryEntry | undefined {
  return inventory.find((e) => e.id === id);
}

function evidenceRefFromEntry(
  entry: EvidenceInventoryEntry,
  startLine = 0,
  endLine?: number,
): EvidenceRef {
  return {
    evidence_id: entry.id,
    file_path: entry.path,
    start_line: startLine,
    end_line: endLine ?? (entry.line_count ?? 100),
    excerpt: entry.excerpt,
    role: entry.role,
  };
}

/**
 * Find the primary implementation file from evidence inventory
 * that matches the concept slice's source evidence.
 */
function findPrimaryImplementation(
  inventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
): EvidenceInventoryEntry | null {
  // Prefer implementation/source_truth roles
  for (const evId of conceptSlice.source_evidence) {
    const entry = findEvidenceById(inventory, evId);
    if (entry && (entry.role === "implementation" || entry.role === "source_truth")) {
      return entry;
    }
  }

  // Fall back to any matching source evidence
  for (const evId of conceptSlice.source_evidence) {
    const entry = findEvidenceById(inventory, evId);
    if (entry) return entry;
  }

  return null;
}

/**
 * Find behavior oracle (test) evidence related to a concept slice.
 */
function findBehaviorOracles(
  inventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
): EvidenceInventoryEntry[] {
  const results: EvidenceInventoryEntry[] = [];
  const allEvidenceIds = new Set([
    ...conceptSlice.source_evidence,
    ...conceptSlice.behavior_evidence,
  ]);

  for (const evId of allEvidenceIds) {
    const entry = findEvidenceById(inventory, evId);
    if (entry && entry.role === "behavior_oracle") {
      results.push(entry);
    }
  }

  return results;
}

/**
 * Get all evidence entries referenced by the concept slice.
 */
function getConceptSliceEvidence(
  inventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
): EvidenceInventoryEntry[] {
  const results: EvidenceInventoryEntry[] = [];
  const allIds = new Set([
    ...conceptSlice.source_evidence,
    ...conceptSlice.behavior_evidence,
    ...conceptSlice.risk_evidence,
  ]);

  for (const evId of allIds) {
    const entry = findEvidenceById(inventory, evId);
    if (entry) results.push(entry);
  }

  return results;
}

// ── Code Slice Generation ─────────────────────────────────────────────

export interface CodeSliceOptions {
  artifactIdPrefix?: string;
}

/**
 * Generate a deterministic code-slice thinking artifact from bounded evidence.
 *
 * The code slice focuses on the smallest code region needed for the
 * concept slice's operation. Every claim cites evidence or is marked
 * inferred. Hidden solution lines are preserved in the full artifact.
 *
 * Fails closed when evidence inventory is empty or no evidence matches
 * the concept slice requirements.
 */
export function generateCodeSliceArtifact(
  evidenceInventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
  options: CodeSliceOptions = {},
): ThinkingArtifact {
  if (!Array.isArray(evidenceInventory) || evidenceInventory.length === 0) {
    throw new Error("Cannot generate code slice: evidence inventory is empty");
  }

  if (!conceptSlice.source_evidence || conceptSlice.source_evidence.length === 0) {
    throw new Error("Cannot generate code slice: concept slice has no source evidence");
  }

  const prefix = options.artifactIdPrefix ?? "TA-CS";
  const artifactId = `${prefix}-${conceptSlice.id}`;

  // Find primary implementation evidence
  const primaryImpl = findPrimaryImplementation(evidenceInventory, conceptSlice);
  if (!primaryImpl) {
    throw new Error(
      `Cannot generate code slice: no implementation/source_truth evidence found ` +
      `in concept slice ${conceptSlice.id}`,
    );
  }

  // Collect all evidence referenced by the concept slice
  const sliceEvidence = getConceptSliceEvidence(evidenceInventory, conceptSlice);
  const behaviorOracles = findBehaviorOracles(evidenceInventory, conceptSlice);

  // Build source evidence refs from concept slice evidence
  const sourceEvidenceRefs: EvidenceRef[] = sliceEvidence.map((entry) =>
    evidenceRefFromEntry(entry),
  );

  // Build hidden solution evidence (implementation internals)
  const hiddenEvidenceRefs: EvidenceRef[] = [evidenceRefFromEntry(primaryImpl)];

  // Check for role conflicts among evidence
  const roleConflict = detectEvidenceRoleConflicts(sourceEvidenceRefs);

  // Build range information
  const ranges = [
    {
      start_line: 1,
      end_line: primaryImpl.line_count ?? 100,
      label: primaryImpl.excerpt.substring(0, 60),
      role: primaryImpl.role,
    },
  ];

  // Build related test references
  const relatedTests = behaviorOracles.map((test) => ({
    file_path: test.path,
    start_line: 1,
    end_line: test.line_count ?? 100,
    label: test.excerpt.substring(0, 60),
  }));

  // Determine hidden lines (mid-section of primary implementation)
  const totalLines = primaryImpl.line_count ?? 100;
  const hiddenStart = Math.max(1, Math.floor(totalLines * 0.15));
  const hiddenEnd = Math.min(totalLines, Math.floor(totalLines * 0.85));
  const hiddenLines: number[] = [];
  for (let i = hiddenStart; i <= hiddenEnd; i++) {
    hiddenLines.push(i);
  }

  // Build operation prompt based on concept slice
  const operationKind: UserOperationKind = conceptSlice.operation_target;
  const operationPrompt = buildCodeSlicePrompt(primaryImpl, conceptSlice, roleConflict);

  // Build success criteria
  const successCriteria = buildCodeSliceSuccessCriteria(primaryImpl, conceptSlice);

  const purposeText = roleConflict.hasConflict
    ? `Show the code region for ${primaryImpl.excerpt} (EV-${primaryImpl.id}). ` +
      `Note: conflicting evidence roles detected — implementation authority overrides lower-ranked evidence. ` +
      `The operation target is ${conceptSlice.operation_target}.`
    : `Show the exact code region for ${primaryImpl.excerpt}. ` +
      `The user must ${conceptSlice.operation_target} the implementation, citing specific lines.`;

  return {
    id: artifactId,
    kind: "code_slice",
    title: `Code Slice: ${primaryImpl.excerpt.substring(0, 50)}`,
    purpose: purposeText,
    concept_slice_id: conceptSlice.id,
    source_evidence: sourceEvidenceRefs,
    hidden_solution_evidence: hiddenEvidenceRefs,
    user_operation: {
      id: `OP-${artifactId}`,
      kind: operationKind,
      prompt: operationPrompt,
      artifact_ids: [artifactId],
      required_evidence: conceptSlice.source_evidence,
      allowed_hints: 3,
      blocked_shortcuts: [
        "cannot_answer_without_line_citations",
        "cannot_skip_evidence_role_explanation",
      ],
      success_criteria: successCriteria,
    },
    renderer: "code_slice",
    payload: {
      file_path: primaryImpl.path,
      ranges,
      collapsed_context: `Evidence inventory has ${evidenceInventory.length} entries. ` +
        `${behaviorOracles.length} test files serve as behavior oracles.`,
      related_tests: relatedTests,
      related_docs: [],
      selected_symbols: extractSymbolNames(primaryImpl.excerpt),
      hidden_lines: hiddenLines,
      prompt_focus: `How does ${conceptSlice.operation_target} the concept "${conceptSlice.label}" ` +
        `connect to the implementation in ${primaryImpl.path}?`,
    },
    success_criteria: successCriteria,
    created_at: new Date().toISOString(),
  };
}

function buildCodeSlicePrompt(
  impl: EvidenceInventoryEntry,
  slice: ConceptSlice,
  roleConflict: { hasConflict: boolean },
): string {
  const base = `Examine the code in ${impl.path}. ` +
    `${slice.operation_target === "trace" ? "Trace" : "Explain"} how ` +
    `"${slice.label}" is implemented. ` +
    `Cite specific line numbers and evidence roles for every claim.`;

  if (roleConflict.hasConflict) {
    return base +
      ` Note: evidence from multiple roles exists for this concept. ` +
      `Resolve any contradictions by checking which evidence has higher authority ` +
      `(implementation over docs, tests over intent).`;
  }

  return base;
}

function buildCodeSliceSuccessCriteria(
  impl: EvidenceInventoryEntry,
  slice: ConceptSlice,
): string[] {
  const criteria = [
    `Identifies the main functions/symbols in ${impl.path} relevant to "${slice.label}"`,
    `Cites specific line ranges for each claim about the code`,
    `Explains the evidence role (${impl.role}) and why it is authoritative`,
  ];

  if (slice.behavior_evidence.length > 0) {
    criteria.push(`Cross-references at least one behavior oracle (test) to validate understanding`);
  }

  criteria.push(
    `Completes the ${slice.operation_target} operation with evidence-backed reasoning`,
  );

  return criteria;
}

// ── Flow Diagram Generation ───────────────────────────────────────────

/**
 * Generate a deterministic flow-diagram thinking artifact from bounded evidence.
 *
 * The flow diagram represents the causal/procedural path through evidence.
 * Every node and edge cites evidence or is marked inferred. Conflicting
 * evidence roles produce unknown/inferred markers.
 *
 * Fails closed when evidence inventory is empty or no evidence matches
 * the concept slice requirements.
 */
export function generateFlowDiagramArtifact(
  evidenceInventory: EvidenceInventoryEntry[],
  conceptSlice: ConceptSlice,
  options: CodeSliceOptions = {},
): ThinkingArtifact {
  if (!Array.isArray(evidenceInventory) || evidenceInventory.length === 0) {
    throw new Error("Cannot generate flow diagram: evidence inventory is empty");
  }

  const sliceEvidence = getConceptSliceEvidence(evidenceInventory, conceptSlice);
  if (sliceEvidence.length === 0) {
    throw new Error(
      `Cannot generate flow diagram: no evidence in inventory matches ` +
      `concept slice ${conceptSlice.id} requirements`,
    );
  }

  const prefix = options.artifactIdPrefix ?? "TA-FD";
  const artifactId = `${prefix}-${conceptSlice.id}`;

  // Build source evidence refs
  const sourceEvidenceRefs: EvidenceRef[] = sliceEvidence.map((entry) =>
    evidenceRefFromEntry(entry),
  );

  // Build hidden evidence (implementation internals)
  const implEntries = sliceEvidence.filter(
    (e) => e.role === "implementation" || e.role === "source_truth",
  );
  const hiddenEvidenceRefs: EvidenceRef[] = implEntries.map((entry) =>
    evidenceRefFromEntry(entry),
  );

  // Check for role conflicts
  const roleConflict = detectEvidenceRoleConflicts(sourceEvidenceRefs);

  // Build nodes from evidence entries
  const nodes: GeneratedNode[] = buildFlowNodes(sliceEvidence, conceptSlice, roleConflict);

  // Build edges between nodes (sequential flow through evidence chain)
  const edges: GeneratedEdge[] = buildFlowEdges(nodes, sliceEvidence, roleConflict);

  // Find entry and terminal nodes
  const entryNode = nodes.length > 0 ? nodes[0].id : "N-001";
  const terminalNodes = nodes.length > 0 ? [nodes[nodes.length - 1].id] : [];

  // Determine uncertainty markers from role conflicts
  const uncertaintyMarkers: string[] = roleConflict.conflicts.map(
    (c) => c.resolution,
  );

  const operationKind: UserOperationKind = conceptSlice.operation_target;
  const operationPrompt = buildFlowDiagramPrompt(sliceEvidence, conceptSlice, roleConflict);

  const successCriteria = [
    `Traces the full path from entry to terminal through all ${sliceEvidence.length} evidence nodes`,
    `For each node, identifies the evidence role and whether the claim is directly evidenced or inferred`,
    `Explains edge relations between nodes using evidence`,
    `Identifies any uncertainty markers or role conflicts in the diagram`,
  ];

  const purposeText = roleConflict.hasConflict
    ? `Show the causal path through "${conceptSlice.label}" with ` +
      `${sliceEvidence.length} evidence sources. ` +
      `Conflicting evidence roles detected — ambiguous nodes marked as inferred/unknown. ` +
      `The user must ${conceptSlice.operation_target} the full flow.`
    : `Show the causal path through "${conceptSlice.label}" ` +
      `across ${sliceEvidence.length} evidence sources. ` +
      `The user must ${conceptSlice.operation_target} the flow end-to-end.`;

  return {
    id: artifactId,
    kind: "flow_diagram",
    title: `Flow: ${conceptSlice.label}`,
    purpose: purposeText,
    concept_slice_id: conceptSlice.id,
    source_evidence: sourceEvidenceRefs,
    hidden_solution_evidence: hiddenEvidenceRefs,
    user_operation: {
      id: `OP-${artifactId}`,
      kind: operationKind,
      prompt: operationPrompt,
      artifact_ids: [artifactId],
      required_evidence: conceptSlice.source_evidence,
      allowed_hints: 3,
      blocked_shortcuts: [
        "cannot_skip_edge_tracing",
        "cannot_ignore_inferred_markers",
      ],
      success_criteria: successCriteria,
    },
    renderer: "flow_diagram",
    payload: {
      nodes,
      edges,
      entry_node: entryNode,
      terminal_nodes: terminalNodes,
      uncertainty_markers: uncertaintyMarkers,
    },
    success_criteria: successCriteria,
    created_at: new Date().toISOString(),
  };
}

function buildFlowNodes(
  evidence: EvidenceInventoryEntry[],
  slice: ConceptSlice,
  roleConflict: { hasConflict: boolean; conflicts: AuthorityCheckResult[] },
): GeneratedNode[] {
  const nodes: GeneratedNode[] = [];

  for (let i = 0; i < evidence.length; i++) {
    const entry = evidence[i];
    const nodeId = `N-${String(i + 1).padStart(3, "0")}`;

    // Determine if this node is inferred based on role conflicts
    const isInferred =
      roleConflict.hasConflict &&
      entry.role !== "implementation" &&
      entry.role !== "source_truth";

    // Determine node role
    const nodeRole = determineNodeRole(i, evidence.length);

    nodes.push({
      id: nodeId,
      label: `${entry.excerpt.substring(0, 60)}`,
      role: nodeRole,
      evidence: [entry.id],
      is_inferred: isInferred,
      user_prompt: buildNodePrompt(entry, slice),
    });
  }

  return nodes;
}

function determineNodeRole(
  index: number,
  total: number,
): "input" | "process" | "data" | "output" | "unknown" {
  if (total === 1) return "process";
  if (index === 0) return "input";
  if (index === total - 1) return "output";
  if (index === Math.floor(total / 2)) return "process";
  return "data";
}

function buildNodePrompt(
  entry: EvidenceInventoryEntry,
  slice: ConceptSlice,
): string {
  switch (entry.role) {
    case "implementation":
      return `What does the implementation in ${entry.path} reveal about "${slice.label}"?`;
    case "behavior_oracle":
      return `How does the test in ${entry.path} validate the behavior of "${slice.label}"?`;
    case "interface":
      return `What contract does ${entry.path} define for "${slice.label}"?`;
    case "intent":
      return `What does the documentation in ${entry.path} claim about "${slice.label}"?`;
    default:
      return `What evidence does ${entry.path} provide for "${slice.label}"?`;
  }
}

function buildFlowEdges(
  nodes: GeneratedNode[],
  evidence: EvidenceInventoryEntry[],
  roleConflict: { hasConflict: boolean },
): GeneratedEdge[] {
  const edges: GeneratedEdge[] = [];

  // Connect nodes in sequence (evidence chain)
  for (let i = 0; i < nodes.length - 1; i++) {
    const fromNode = nodes[i];
    const toNode = nodes[i + 1];

    // Determine if edge is inferred
    const fromRole = evidence[i]?.role;
    const toRole = evidence[i + 1]?.role;
    const isInferred =
      roleConflict.hasConflict &&
      fromRole !== toRole &&
      fromRole !== "implementation" &&
      toRole !== "implementation";

    const relation = i === 0
      ? "input_to_process"
      : i === nodes.length - 2
        ? "produces"
        : "feeds_into";

    edges.push({
      from: fromNode.id,
      to: toNode.id,
      relation,
      evidence: [fromNode.evidence[0], toNode.evidence[0]].filter(
        (e): e is string => !!e,
      ),
      is_inferred: isInferred,
    });
  }

  return edges;
}

function buildFlowDiagramPrompt(
  evidence: EvidenceInventoryEntry[],
  slice: ConceptSlice,
  roleConflict: { hasConflict: boolean },
): string {
  const evidenceList = evidence
    .map((e) => `  - ${e.id} (${e.role}): ${e.path}`)
    .join("\n");

  let prompt = `Trace the flow through the concept "${slice.label}" ` +
    `across the following evidence:\n${evidenceList}\n\n` +
    `For each step in the flow, identify: (1) the evidence role, ` +
    `(2) whether the claim is directly evidenced or inferred, and ` +
    `(3) how the evidence connects to the next step.`;

  if (roleConflict.hasConflict) {
    prompt +=
      `\n\nIMPORTANT: Evidence role conflicts exist in this flow. ` +
      `Resolve them by treating implementation and source_truth evidence as ` +
      `authoritative over intent/docs. Mark ambiguous connections as inferred.`;
  }

  return prompt;
}

// ── Deterministic Artifact Generation ─────────────────────────────────

/**
 * Generate a complete set of deterministic thinking artifacts for a
 * Deep Ownership fixture. For the given concept slice, produces at
 * minimum a code_slice and flow_diagram artifact.
 *
 * Every generated artifact cites evidence or marks claims inferred/unknown.
 * Hidden solution refs are preserved but excluded from pre-attempt snapshots.
 */
export function generateDeterministicArtifacts(
  fixture: DeepOwnershipFixture,
): ThinkingArtifact[] {
  const artifacts: ThinkingArtifact[] = [];

  // Generate code slice from implementation evidence
  const codeSlice = generateCodeSliceArtifact(
    fixture.evidence_inventory,
    fixture.concept_slice,
  );
  artifacts.push(codeSlice);

  // Generate flow diagram from all concept slice evidence
  const flowDiagram = generateFlowDiagramArtifact(
    fixture.evidence_inventory,
    fixture.concept_slice,
  );
  artifacts.push(flowDiagram);

  return artifacts;
}

// ── Utility ───────────────────────────────────────────────────────────

/**
 * Extract candidate symbol names from an evidence excerpt.
 * Simple heuristic: looks for camelCase, PascalCase, and snake_case identifiers.
 */
function extractSymbolNames(excerpt: string): string[] {
  const symbols: string[] = [];
  const matches = excerpt.match(/\b[a-zA-Z_][a-zA-Z0-9_]{2,}\b/g);
  if (matches) {
    const seen = new Set<string>();
    for (const m of matches) {
      if (!seen.has(m) && !["the", "and", "for", "from", "with", "that", "this"].includes(m.toLowerCase())) {
        seen.add(m);
        symbols.push(m);
      }
    }
  }
  return symbols.slice(0, 10); // Max 10 symbols
}
